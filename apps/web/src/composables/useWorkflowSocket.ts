import { onMounted, onUnmounted, shallowRef, type Ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

export function useWorkflowSocket(trackableId?: string): {
  socket: Ref<Socket | null>;
  onWorkflowItemUpdate: (cb: (data: unknown) => void) => void;
  onTrackableUpdate: (cb: (data: unknown) => void) => void;
} {
  const socket = shallowRef<Socket | null>(null);
  const callbacks = {
    workflowItemUpdate: [] as Array<(data: unknown) => void>,
    trackableUpdate: [] as Array<(data: unknown) => void>,
  };

  onMounted(() => {
    const authStore = useAuthStore();
    socket.value = io('/workflow', {
      query: { organizationId: authStore.user?.organizationId },
      auth: { token: authStore.accessToken },
    });

    if (trackableId) {
      socket.value.emit('joinTrackable', { trackableId });
    }

    socket.value.on('workflowItemUpdate', (data) => {
      callbacks.workflowItemUpdate.forEach((cb) => cb(data));
    });

    socket.value.on('trackableUpdate', (data) => {
      callbacks.trackableUpdate.forEach((cb) => cb(data));
    });
  });

  onUnmounted(() => {
    if (trackableId && socket.value) {
      socket.value.emit('leaveTrackable', { trackableId });
    }
    socket.value?.disconnect();
  });

  function onWorkflowItemUpdate(cb: (data: unknown) => void) {
    callbacks.workflowItemUpdate.push(cb);
  }

  function onTrackableUpdate(cb: (data: unknown) => void) {
    callbacks.trackableUpdate.push(cb);
  }

  return { socket, onWorkflowItemUpdate, onTrackableUpdate };
}
