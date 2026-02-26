import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "teacher@demo.com" },
    update: {},
    create: {
      email: "teacher@demo.com",
      username: "teacher_demo",
      hashedPassword,
      firstName: "Demo",
      lastName: "Teacher",
      role: "TEACHER",
      teacher: { create: {} },
    },
  });

  console.log(`Demo teacher created: ${user.email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
