import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtapesModule } from './etapes/etapes.module';
import { ModulesModule } from './modules/modules.module';
import { RolesModule } from './roles/roles.module';
import { FilesModule } from './files/files.module';
import { StudentsModule } from './students/students.module';
import { UsersModule } from './users/users.module';

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
    }),
    EtapesModule,
    ModulesModule,
    RolesModule,
    FilesModule,
    StudentsModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
