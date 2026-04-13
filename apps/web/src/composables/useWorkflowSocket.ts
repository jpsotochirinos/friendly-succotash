import { onMounted, onUnmounted, ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

export function useWorkflowSocket(trackableId?: string) {
  const socket = ref<Socket | null>(null);
  const callbacks = {
    workflowItemUpdate: [] as Function[],
    trackableUpdate: [] as Function[],
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

  function onWorkflowItemUpdate(cb: Function) {
    callbacks.workflowItemUpdate.push(cb);
  }

  function onTrackableUpdate(cb: Function) {
    callbacks.trackableUpdate.push(cb);
  }

  return { socket, onWorkflowItemUpdate, onTrackableUpdate };
}
