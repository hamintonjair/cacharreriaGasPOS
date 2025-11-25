import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await prisma.user.create({
      data: {
        nombre: 'Admin Test',
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    
    console.log('Usuario de prueba creado exitosamente:', user);
  } catch (error) {
    console.error('Error al crear usuario de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
