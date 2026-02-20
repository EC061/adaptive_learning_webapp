Google Docs - https://docs.google.com/document/d/1jny8N5S4Npfvz9mCveuMjOehm7nQWT9tmpNaGn95n7Y/edit?tab=t.0

---------------------------------------------------------------------------------------------------------------------------------------------------------------

# 🎬 Django Web Application

This is a Django-based web application. This guide will walk you through setting it up from scratch, including Python installation, environment setup, and running the server.

---

## 📦 Prerequisites

- Python 3.10 or higher
- [uv](https://docs.astral.sh/uv/) (Python package and project manager)
- Git (optional, for cloning)
- Basic terminal/command-line usage

---

## 🧰 Step-by-Step Setup

### 1️⃣ Install Python & pip

Download and install Python from the official website:

🔗 https://www.python.org/downloads/

> ✅ During installation, ensure you check **"Add Python to PATH"**.

To verify installation:

<details>
<summary>Windows</summary>

```bash
python --version
pip --version
```
</details>

<details>
<summary>macOS/Linux</summary>

```bash
python3 --version
pip3 --version
```
</details>

---

### 2️⃣ Clone the Project Repository

Clone this repository or download the ZIP.

```bash
git clone https://github.com/ypjoshi18/adaptive_learning_webapp.git
cd your-repo-name
```

Or download the ZIP and extract it manually.

---

### 3️⃣ Create Virtual Environment & Install Dependencies

This project uses [uv](https://docs.astral.sh/uv/) for environment and dependency management. All dependencies are defined in `pyproject.toml`.

```bash
uv sync
```

> This creates a `.venv/` virtual environment and installs all dependencies automatically.

---

### 4️⃣ Apply Migrations

Run database migrations:

```bash
uv run python manage.py makemigrations
uv run python manage.py migrate
```

---

### 5️⃣ Create a Superuser (Admin Access)

```bash
uv run python manage.py createsuperuser
```

---

### 6️⃣ Run the Development Server

```bash
uv run python manage.py runserver
```

Now open your browser and go to:

- App: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Admin Panel: [http://127.0.0.1:8000/admin](http://127.0.0.1:8000/admin)

---

### 7️⃣ Run the Production Server

Collect static files and start Gunicorn:

```bash
uv run python manage.py collectstatic --noinput
uv run gunicorn adaptive_learning.wsgi:application --bind 0.0.0.0:8000 --timeout 120 --preload
```

> `--timeout 120` allows time for model loading at startup. `--preload` loads the app once before forking workers.

---

## 📂 Project Structure

```
adaptive_learning_webapp/
├── manage.py
├── pyproject.toml
├── uv.lock
├── README.md
├── .env
├── db.sqlite3
├── adaptive_learning/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── my_app/
│   ├── views.py
│   ├── models.py
│   └── ...
```

---

## 🔐 How to Create a Hugging Face API Key for Phi-3 Access

To use the **Phi-3** model or any other hosted model on Hugging Face via API, you need to generate an API key. Follow these steps:

### 📌 Step-by-Step Instructions

#### 1. Sign in or Sign up
- Visit [https://huggingface.co](https://huggingface.co)
- Log in to your account, or create one if you don’t already have it.

#### 2. Navigate to Access Tokens
- Click on your profile picture in the top-right corner.
- Select **"Settings"** from the dropdown menu.
- From the left sidebar, click on **"Access Tokens**" or go directly to:  
  [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

#### 3. Generate a New Token
- Click **"New token"**
- Enter a name (e.g., `phi3-token`)
- Choose a role:
  - Select **"Read"** if you only need to access and use models.
  - For most use cases, **"Read" is sufficient**.
- Click **"Generate"**

#### 4. Copy and Save the Token
- Copy the token shown — **you won’t be able to see it again**.
- Store it securely (e.g., in an environment variable or a secret manager).
- ⚠️ **Do NOT commit this token to version control (e.g., GitHub).**

---


## ❓ Troubleshooting

- If `python` or `pip` does not work on macOS/Linux, try `python3` and `pip3`.
- Always activate the virtual environment before running commands.
- Use `deactivate` to exit the virtual environment.

---

## 👨‍💻 Author

**Abhishek Patwardhan**  
GitHub: [https://github.com/AbhiMP2804](https://github.com/AbhiMP2804)

**Yash Joshi**  
GitHub: [GitHub](https://github.com/ypjoshi18)

---


