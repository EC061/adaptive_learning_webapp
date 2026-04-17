import { PrismaClient } from "@prisma/client";
import { prebuiltQuestions, prebuiltSubtopics, prebuiltTopic } from "./prebuilt-questions";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping database for clean seed...");

  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.classTopic.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.subtopic.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.class.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database wiped. Seeding fresh data...");

  const topic = await prisma.topic.create({
    data: prebuiltTopic,
  });

  console.log(`Topic: ${topic.name}`);

  for (const subtopicData of prebuiltSubtopics) {
    const subtopic = await prisma.subtopic.create({
      data: { ...subtopicData, topicId: topic.id },
    });
    console.log(`  Subtopic: ${subtopic.name}`);
  }

  for (const questionData of prebuiltQuestions) {
    await prisma.question.create({
      data: {
        text: questionData.text,
        topicId: topic.id,
        subtopicId: questionData.subtopicId,
        difficultyLevel: questionData.difficulty,
        options: { create: questionData.options },
      },
    });
  }

  console.log(`Seeded ${prebuiltQuestions.length} questions`);
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
