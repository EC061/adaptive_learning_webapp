import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BookOpen, AlertCircle } from "lucide-react";
import PageViewer from "./page-viewer";

export default async function MaterialViewerPage(props: { params: Promise<{ id: string; materialId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const [{ id: classId, materialId }, teacher] = await Promise.all([
    props.params,
    prisma.teacher.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  if (!teacher) redirect("/login");

  const material = await prisma.learningMaterial.findUnique({
    where: { id: materialId },
    include: {
      pages: {
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (!material || material.classId !== classId || material.teacherId !== teacher.id) {
    redirect(`/teacher/classes/${classId}/materials`);
  }

  const neededPages = material.pages.filter((p) => p.needed === true);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-x-4">
        <Link
          href={`/teacher/classes/${classId}/materials`}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{material.title || material.originalName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {material.totalPages} Pages • Processed on {new Date(material.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {material.processingStatus === "FAILED" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-x-4">
          <AlertCircle className="size-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-red-800">Processing Failed</h2>
            <p className="text-red-700 mt-1">{material.errorMessage}</p>
          </div>
        </div>
      )}

      {material.processingStatus === "SUCCESS" && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <div className="flex items-center gap-x-3 mb-4">
            <BookOpen className="size-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-blue-900">Document Summary</h2>
          </div>
          <p className="text-blue-800 text-lg leading-relaxed mb-6">
            {material.batchDescription || "No summary available."}
          </p>
          
          {(() => {
            let concepts: string[] = [];
            try {
              concepts = JSON.parse(material.batchKeyConcepts);
            } catch (e) {}
            return concepts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-3">
                Key Concepts
              </h3>
              <div className="flex flex-wrap gap-2">
                {concepts.map((concept, idx) => (
                  <span
                    key={concept}
                    className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm font-medium shadow-sm border border-blue-200"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
            );
          })()}
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Core Content Pages</h2>
        {neededPages.length === 0 ? (
          <p className="text-gray-500 italic">No core pages identified.</p>
        ) : (
          <div className="grid gap-8">
            {neededPages.map((page) => (
              <div key={page.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-200">
                  <PageViewer classId={classId} materialId={materialId} pageId={page.id} />
                </div>
                <div className="p-6 md:w-2/3 flex flex-col justify-center">
                  <div className="mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Page {page.pageNumber}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{page.keyConcept}</h3>
                  <p className="text-gray-700 text-lg leading-relaxed">{page.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
