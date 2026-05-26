import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MaterialUploadForm from "./material-upload";
import Link from "next/link";
import { FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import MaterialDeleteButton from "./material-delete-button";

export default async function ClassMaterialsPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const [{ id: classId }, teacher] = await Promise.all([
    props.params,
    prisma.teacher.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  if (!teacher) redirect("/login");

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: teacher.id },
  });

  if (!cls) redirect("/teacher/classes");

  const materials = await prisma.learningMaterial.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Materials</h1>
          <p className="text-gray-600">Upload and manage AI-processed documents for {cls.name}.</p>
        </div>
        <Link
          href={`/teacher/classes/${classId}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Back to Class
        </Link>
      </div>

      <div className="mb-10">
        <MaterialUploadForm classId={classId} />
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Uploaded Documents</h2>

      {materials.length === 0 ? (
        <div className="bg-white border rounded-lg p-10 text-center">
          <p className="text-gray-500">No materials uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {materials.map((mat) => {
            const isProcessing = mat.processingStatus === "PROCESSING" || mat.processingStatus === "IDLE";
            const progress = mat.totalPages > 0 ? (mat.processedPages / mat.totalPages) * 100 : 0;

            return (
              <div key={mat.id} className="bg-white border rounded-lg p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-x-4">
                  <div className="p-3 bg-blue-50 rounded-full">
                    <FileText className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{mat.title || mat.originalName}</h3>
                    <div className="flex items-center gap-x-2 text-sm text-gray-500 mt-1">
                      <span>{(mat.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{mat.totalPages} Pages</span>
                      <span>•</span>
                      <span>
                        {new Date(mat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end w-64">
                  {mat.processingStatus === "SUCCESS" && (
                    <div className="flex items-center text-green-600 font-medium text-sm">
                      <CheckCircle className="size-4 mr-1" /> Ready
                    </div>
                  )}
                  {mat.processingStatus === "FAILED" && (
                    <div className="flex items-center text-red-600 font-medium text-sm" title={mat.errorMessage || "Error"}>
                      <AlertTriangle className="size-4 mr-1" /> Processing Failed
                    </div>
                  )}
                  {isProcessing && mat.uploadStatus === "READY" && (
                    <div className="w-full">
                      <div className="flex justify-between text-xs text-blue-600 mb-1 font-medium">
                        <span className="flex items-center"><Clock className="size-3 mr-1" /> Analyzing…</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {mat.uploadStatus === "PENDING" && (
                    <span className="text-sm text-gray-500 italic">Upload interrupted</span>
                  )}
                  
                  {mat.processingStatus === "SUCCESS" && (
                    <Link
                      href={`/teacher/classes/${classId}/materials/${mat.id}`}
                      className="mt-3 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                    >
                      View Analysis
                    </Link>
                  )}
                  <div className="mt-3">
                    <MaterialDeleteButton classId={classId} materialId={mat.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
