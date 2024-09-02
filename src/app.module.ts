import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtapesModule } from './etapes/etapes.module';
import { ModulesModule } from './modules/modules.module';
import { RolesModule } from './roles/roles.module';
import { FilesModule } from './files/files.module';
import { StudentsModule } from './students/students.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ServicesModule } from './services/services.module';
import * as fs from 'fs';

const publicDir = join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'ucd_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: ['error'],
      connectTimeout: 60000,
    }),
    ServeStaticModule.forRoot({
      rootPath: publicDir,
      serveRoot: '/static',
      exclude: ['/api/(.*)'],
    }),
    EtapesModule,
    ModulesModule,
    RolesModule,
    FilesModule,
    StudentsModule,
    UsersModule,
    AuthModule,
    ServicesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
