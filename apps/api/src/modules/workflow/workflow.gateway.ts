import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getAllowedCorsOrigins } from '../../common/cors-origins';

@WebSocketGateway({
  cors: {
    origin: getAllowedCorsOrigins(),
    credentials: true,
  },
  namespace: '/workflow',
})
export class WorkflowGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const orgId = client.handshake.query.organizationId as string;
    if (orgId) {
      client.join(`org:${orgId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('joinTrackable')
  handleJoinTrackable(client: Socket, payload: { trackableId: string }) {
    client.join(`trackable:${payload.trackableId}`);
  }

  @SubscribeMessage('leaveTrackable')
  handleLeaveTrackable(client: Socket, payload: { trackableId: string }) {
    client.leave(`trackable:${payload.trackableId}`);
  }

  emitWorkflowItemUpdate(orgId: string, data: Record<string, unknown>) {
    this.server.to(`org:${orgId}`).emit('workflowItemUpdate', data);
    if (data.trackableId) {
      this.server.to(`trackable:${data.trackableId}`).emit('workflowItemUpdate', data);
    }
  }

  emitTrackableUpdate(orgId: string, data: Record<string, unknown>) {
    this.server.to(`org:${orgId}`).emit('trackableUpdate', data);
  }
}
