import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsPublicController } from './invitations-public.controller';
import { InvitationsService } from './invitations.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [InvitationsController, InvitationsPublicController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
