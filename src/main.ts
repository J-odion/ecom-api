import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ecom-crm-frontend.vercel.app/',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  const config = new DocumentBuilder()
    .setTitle('E-commerce CRM Enterprise API')
    .setDescription('A high-performance operations infrastructure for multi-location inventory, intelligent lead tracking, and automated financial settlements.')
    .setVersion('1.2.0')
    .addBearerAuth()
    .addTag('Authentication', 'Staff registration, verification, and session management')
    .addTag('Leads', 'Intelligent lead capture, identity tracking, and smart assignment')
    .addTag('Lead Forms', 'Embeddable form configuration and management')
    .addTag('Inventory', 'Multi-location stock tracking and reservation')
    .addTag('Orders', 'Order lifecycle from scheduling to cash remittance')
    .addTag('Finance', 'Revenue, COGS, and commission payout management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'CRM API Docs',
  });

  const port = process.env.PORT || 8980;
  await app.listen(port);

  const { Logger } = require('@nestjs/common');
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
  Logger.log(`📚 Swagger documentation is available at: http://localhost:${port}/docs`);
}
bootstrap();