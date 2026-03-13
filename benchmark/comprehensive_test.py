import asyncio
import aiohttp
import time
import argparse
import random
import string
import os

try:
    import matplotlib.pyplot as plt
    from tqdm import tqdm
    from tqdm.asyncio import tqdm_asyncio
    from prettytable import PrettyTable
    import json
except ImportError:
    print("Packages missing. Please install with: uv pip install matplotlib tqdm prettytable")
    exit(1)

async def get_csrf_token(session, base_url):
    url = f"{base_url}/api/auth/csrf"
    try:
        async with session.get(url) as res:
            if res.status == 200:
                data = await res.json()
                return data.get("csrfToken")
    except:
        pass
    return None

async def login(session, base_url, identifier, password):
    csrf_token = await get_csrf_token(session, base_url)
    if not csrf_token: return False
    url = f"{base_url}/api/auth/callback/credentials"
    data = {"redirect": "false", "identifier": identifier, "password": password, "csrfToken": csrf_token}
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    try:
        async with session.post(url, data=data, headers=headers, allow_redirects=False) as res:
            return res.status in (200, 302, 303) and (
                'auth' in str(session.cookie_jar) or any('auth' in k.lower() for k in res.cookies.keys())
            )
    except:
        return False

async def setup_test_data(session, base_url, num_topics, num_subtopics):
    print(f"\n--- 🚧 Setting up Data ({num_topics} Topics, {num_subtopics} Subtopics/Topic) 🚧 ---")
    
    print("1. Creating Mega Class...")
    async with session.post(f"{base_url}/api/classes", json={"name": f"Benchmark Class {num_topics}x{num_subtopics} {int(time.time())}"}) as res:
        if res.status != 201:
            print(f"Failed to create class! Status {res.status}: {await res.text()}")
            return None
        cls_data = await res.json()
        class_id = cls_data["id"]
    
    print(f"2. Creating {num_topics} Topics and {num_topics * num_subtopics} Subtopics...")
    for i in tqdm(range(1, num_topics + 1), desc="Topics Setup"):
        async with session.post(f"{base_url}/api/topics", json={"name": f"Topic {i}", "order": i}) as res:
            if res.status != 201: continue
            topic_data = await res.json()
            topic_id = topic_data["id"]
        
        await session.post(f"{base_url}/api/classes/{class_id}/topics", json={"topicId": topic_id})
        await session.patch(f"{base_url}/api/classes/{class_id}/topics", json={"topicId": topic_id, "published": True})

        sem = asyncio.Semaphore(100)
        async def create_subtopic(j, t_id, t_idx):
            async with sem:
                async with session.post(f"{base_url}/api/topics/{t_id}/subtopics", json={"name": f"Subtopic {t_idx}.{j}", "order": j}) as r:
                    await r.read()
        
        await asyncio.gather(*[create_subtopic(j, topic_id, i) for j in range(1, num_subtopics + 1)])
    
    print("3. Generating Invitation Link...")
    async with session.post(f"{base_url}/api/invitations", json={"classId": class_id}) as res:
        inv_data = await res.json()
        invite_token = inv_data["token"]
        
    print("4. Enrolling 20 Students (Reduced to speed up iteration)...")
    semaphore = asyncio.Semaphore(20)
    
    async def enroll_student(s_idx):
        random_str = ''.join(random.choices(string.ascii_letters, k=6))
        payload = {
            "firstName": "Test",
            "lastName": f"Student{s_idx}",
            "username": f"bm_{int(time.time())}_{s_idx}_{random_str}",
            "email": f"bm_{int(time.time())}_{s_idx}_{random_str}@example.com",
            "password": "Password123!"
        }
        async with semaphore:
            async with aiohttp.ClientSession() as isolated_session:
                async with isolated_session.post(f"{base_url}/api/invitations/{invite_token}", json=payload) as res:
                    await res.read()
                    
    await tqdm_asyncio.gather(*[enroll_student(s) for s in range(20)], desc="Student Setup")
    print("   -> Data setup complete.")
    return class_id

async def benchmark_endpoint(session, url, method="GET", json_payload=None):
    start = time.time()
    try:
        if method == "GET":
            async with session.get(url) as res:
                await res.read()
                return time.time() - start, res.status
        else:
            async with session.post(url, json=json_payload) as res:
                await res.read()
                return time.time() - start, res.status
    except:
        return time.time() - start, 500

async def worker(session, url, requests_per_worker, results_dict, method="GET", payload=None, pbar=None):
    for _ in range(requests_per_worker):
        duration, status = await benchmark_endpoint(session, url, method, payload)
        results_dict['times'].append(duration)
        if status in (200, 201):
            results_dict['success'] += 1
        else:
            results_dict['failed'] += 1
        if pbar:
            pbar.update(1)

async def run_single_size_test(base_url, identifier, password, concurrency, total_requests, num_topics, num_subtopics):
    base_url = base_url.rstrip('/')
    cookie_jar = aiohttp.CookieJar(unsafe=True)
    async with aiohttp.ClientSession(cookie_jar=cookie_jar) as session:
        logged_in = await login(session, base_url, identifier, password)
        if not logged_in:
            print("Login failed! Ensure NextAuth is working and credentials are correct.")
            return None

        class_id = await setup_test_data(session, base_url, num_topics, num_subtopics)
        if not class_id:
            return None

        endpoints_to_test = {
            "GET_All_Classes": {"path": "/api/classes", "method": "GET"},
            "GET_Heavy_Class_Payload": {"path": f"/api/classes/{class_id}", "method": "GET"},
            "GET_Topics_List": {"path": "/api/topics", "method": "GET"},
            "GET_Class_Topics": {"path": f"/api/classes/{class_id}/topics", "method": "GET"},
        }
        
        results = {
            name: {'success': 0, 'failed': 0, 'times': [], 'total_time': 0} for name in endpoints_to_test
        }

        requests_per_worker = max(1, total_requests // concurrency)
        
        for ep_name, ep_config in endpoints_to_test.items():
            url = f"{base_url}{ep_config['path']}"
            method = ep_config.get('method', 'GET')
            payload = ep_config.get('payload')
            
            phase_start = time.time()
            total_ep_requests = requests_per_worker * concurrency
            with tqdm(total=total_ep_requests, desc=f"Testing {ep_name}") as pbar:
                tasks = [
                    asyncio.create_task(worker(session, url, requests_per_worker, results[ep_name], method, payload, pbar))
                    for _ in range(concurrency)
                ]
                await asyncio.gather(*tasks)
            phase_duration = time.time() - phase_start
            results[ep_name]['total_time'] = phase_duration
        
        summary = {}
        for ep_name, stats in results.items():
            t_total = len(stats['times'])
            if t_total == 0: continue
            
            avg_time = sum(stats['times']) / t_total
            max_time = max(stats['times'])
            phase_time = stats['total_time']
            throughput = (stats['success'] + stats['failed']) / phase_time if phase_time > 0 else 0
            
            summary[ep_name] = {
                'avg_latency': avg_time,
                'max_latency': max_time,
                'throughput': throughput
            }
            
        return summary

def plot_results(sizes, all_summaries, plot_name):
    print("\n--- 📈 GENERATING PLOTS 📈 ---")
    endpoints = list(all_summaries[0].keys())
    
    # Group 1: Subtopic effects (fixed 5 topics, varying subtopics)
    g1_indices = [i for i, size in enumerate(sizes) if size[0] == 5]
    g1_sizes = [sizes[i][1] for i in g1_indices]
    g1_summaries = [all_summaries[i] for i in g1_indices]
    
    # Group 2: Topic effects (varying topics, fixed 1000 subtopics)
    g2_indices = [i for i, size in enumerate(sizes) if size[1] == 1000]
    g2_sizes = [sizes[i][0] for i in g2_indices]
    g2_summaries = [all_summaries[i] for i in g2_indices]

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # [0, 0] Latency vs Subtopics (Group 1)
    for ep in endpoints:
        latencies = [s[ep]['avg_latency'] for s in g1_summaries]
        axes[0, 0].plot(g1_sizes, latencies, marker='o', label=ep)
    axes[0, 0].set_title('Avg Latency vs Subtopics (Fixed 5 Topics)')
    axes[0, 0].set_xlabel('Number of Subtopics')
    axes[0, 0].set_ylabel('Average Latency (s)')
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # [0, 1] Throughput vs Subtopics (Group 1)
    for ep in endpoints:
        throughputs = [s[ep]['throughput'] for s in g1_summaries]
        axes[0, 1].plot(g1_sizes, throughputs, marker='s', label=ep)
    axes[0, 1].set_title('Throughput vs Subtopics (Fixed 5 Topics)')
    axes[0, 1].set_xlabel('Number of Subtopics')
    axes[0, 1].set_ylabel('Throughput (req/sec)')
    axes[0, 1].legend()
    axes[0, 1].grid(True)

    # [1, 0] Latency vs Topics (Group 2)
    for ep in endpoints:
        latencies = [s[ep]['avg_latency'] for s in g2_summaries]
        axes[1, 0].plot(g2_sizes, latencies, marker='o', label=ep)
    axes[1, 0].set_title('Avg Latency vs Topics (Fixed 1000 Subtopics)')
    axes[1, 0].set_xlabel('Number of Topics')
    axes[1, 0].set_ylabel('Average Latency (s)')
    axes[1, 0].legend()
    axes[1, 0].grid(True)
    
    # [1, 1] Throughput vs Topics (Group 2)
    for ep in endpoints:
        throughputs = [s[ep]['throughput'] for s in g2_summaries]
        axes[1, 1].plot(g2_sizes, throughputs, marker='s', label=ep)
    axes[1, 1].set_title('Throughput vs Topics (Fixed 1000 Subtopics)')
    axes[1, 1].set_xlabel('Number of Topics')
    axes[1, 1].set_ylabel('Throughput (req/sec)')
    axes[1, 1].legend()
    axes[1, 1].grid(True)

    plt.tight_layout()
    plt.savefig(plot_name)
    print(f"\n✅ Done! Visualization saved to {plot_name}.")

async def run_1000_students_write_test(session, base_url):
    print("\n--- 🏁 FINAL TEST: 1000 Concurrent Student Registrations 🏁 ---")
    
    print("1. Creating dummy class for final write test...")
    async with session.post(f"{base_url}/api/classes", json={"name": f"1k Students Reg Test {int(time.time())}"}) as res:
        cls_data = await res.json()
        class_id = cls_data["id"]
        
    print("2. Generating Invitation Link...")
    async with session.post(f"{base_url}/api/invitations", json={"classId": class_id}) as res:
        inv_data = await res.json()
        invite_token = inv_data["token"]
        
    print("3. Enrolling 1000 Students...")
    semaphore = asyncio.Semaphore(100)
    
    async def enroll_student_1k(s_idx):
        random_str = ''.join(random.choices(string.ascii_letters, k=6))
        payload = {
            "firstName": "Test",
            "lastName": f"Student{s_idx}",
            "username": f"bm_1k_{int(time.time())}_{s_idx}_{random_str}",
            "email": f"bm_1k_{int(time.time())}_{s_idx}_{random_str}@example.com",
            "password": "Password123!"
        }
        async with semaphore:
            start_t = time.time()
            async with aiohttp.ClientSession() as isolated_session:
                async with isolated_session.post(f"{base_url}/api/invitations/{invite_token}", json=payload) as res:
                    await res.read()
                    return time.time() - start_t, res.status == 200

    enroll_start_time = time.time()
    results = await tqdm_asyncio.gather(*[enroll_student_1k(s) for s in range(1000)], desc="Enrolling 1000 students")
    enroll_duration = time.time() - enroll_start_time
    
    enroll_times = [r[0] for r in results]
    success_count = sum(1 for r in results if r[1])
    
    summary = {
        'success': success_count,
        'failed': 1000 - success_count,
        'duration': enroll_duration,
        'throughput': len(results) / enroll_duration if enroll_duration > 0 else 0,
        'avg_latency': sum(enroll_times)/len(enroll_times) if enroll_times else 0,
        'max_latency': max(enroll_times) if enroll_times else 0,
        'min_latency': min(enroll_times) if enroll_times else 0,
    }
    return summary

async def run_sizes_sweep(base_url, identifier, password, concurrency, requests, data_path, plot_name):
    sizes = [
        (5, 10),
        (5, 20),
        (5, 50),
        (5, 100),
        (5, 1000),
        (10, 50),
        (20, 25),
        (50, 10),
        (100, 5)
    ]
    
    all_summaries = []
    
    # Try loading existing data
    if os.path.exists(data_path):
        print(f"\n📦 Found existing data file at {data_path}. Loading results...")
        with open(data_path, 'r') as f:
            all_summaries = json.load(f)
        
        # Ensure format consistency
        for s in all_summaries:
            for ep_name in s.keys():
                pass
                
        plot_results(sizes, all_summaries, plot_name)
    else:
        print(f"\n🚀 Starting sweep across {len(sizes)} size configurations...")
        
        for (num_topics, num_subtopics) in sizes:
            total_items = num_topics * num_subtopics
            
            print(f"\n=======================================================")
            print(f"🔄 CONFIGURATION: {num_topics} Topics, {num_subtopics} Subtopics ({total_items} items total)")
            print(f"=======================================================")
            
            summary = await run_single_size_test(base_url, identifier, password, concurrency, requests, num_topics, num_subtopics)
            if not summary:
                print(f"Error occurred during test of size {total_items}. Skipping remaining...")
                break
                
            all_summaries.append(summary)
            
            print(f"\n--- 📊 SUMMARY FOR CONFIGURATION ({total_items} items) 📊 ---")
            for ep, st in summary.items():
                print(f"[{ep}] Avg Latency: {st['avg_latency']:.4f}s | Throughput: {st['throughput']:.2f} req/s")
                
            # Optional sleep to let the server breathe
            await asyncio.sleep(2)
        
        # Save results to disk
        print(f"\n💾 Saving results to {data_path}...")
        with open(data_path, 'w') as f:
            json.dump(all_summaries, f, indent=4)
            
        if all_summaries and len(all_summaries) == len(sizes):
            plot_results(sizes, all_summaries, plot_name)
            
    print("\n=======================================================")
    print("📊 FINAL BENCHMARK STATS (PRETTYTABLE) 📊")
    print("=======================================================\n")
    
    pt = PrettyTable()
    pt.field_names = ["Size (Topics x Subtopics)", "Endpoint", "Avg Latency (s)", "Max Latency (s)", "Throughput (req/s)"]
    
    for idx, (num_topics, num_subtopics) in enumerate(sizes):
        if idx >= len(all_summaries):
            break
        summary = all_summaries[idx]
        size_str = f"{num_topics} x {num_subtopics}"
        for ep, st in summary.items():
            pt.add_row([
                size_str, 
                ep, 
                f"{st['avg_latency']:.4f}", 
                f"{st['max_latency']:.4f}", 
                f"{st['throughput']:.2f}"
            ])
    
    print(pt)

    print("\n--- 🏁 RUNNING 1000 STUDENTS WRITE TEST 🏁 ---")
    cookie_jar = aiohttp.CookieJar(unsafe=True)
    async with aiohttp.ClientSession(cookie_jar=cookie_jar) as session:
        logged_in = await login(session, base_url.rstrip('/'), identifier, password)
        if logged_in:
            final_1k_summary = await run_1000_students_write_test(session, base_url.rstrip('/'))
            print("\n--- 🏁 1000 Concurrent Student Write DB Test 🏁 ---")
            pt_1k = PrettyTable()
            pt_1k.field_names = ["Metric", "Value"]
            pt_1k.add_row(["Total Students Enrolled", 1000])
            pt_1k.add_row(["Success Count", final_1k_summary['success']])
            pt_1k.add_row(["Failed Count", final_1k_summary['failed']])
            pt_1k.add_row(["Total Duration (s)", f"{final_1k_summary['duration']:.2f}"])
            pt_1k.add_row(["Throughput (req/sec)", f"{final_1k_summary['throughput']:.2f}"])
            pt_1k.add_row(["Avg Latency (s)", f"{final_1k_summary['avg_latency']:.4f}"])
            pt_1k.add_row(["Min Latency (s)", f"{final_1k_summary['min_latency']:.4f}"])
            pt_1k.add_row(["Max Latency (s)", f"{final_1k_summary['max_latency']:.4f}"])
            print(pt_1k)
        else:
            print("Failed to login for final 1000 students test!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multi-size Benchmark & Plotting")
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("-c", "--concurrency", type=int, default=50, help="Concurrent connections per endpoint")
    parser.add_argument("-n", "--requests", type=int, default=500, help="Total requests per endpoint per configuration")
    parser.add_argument("--data-path", default="./benchmark/benchmark_results.json", help="Path to save or load the JSON benchmark data")
    parser.add_argument("--plot-name", default="./benchmark/benchmark_effects_plot.png", help="The output filename for the generated plot")
    
    args = parser.parse_args()
    asyncio.run(run_sizes_sweep(args.url, args.username, args.password, args.concurrency, args.requests, args.data_path, args.plot_name))
