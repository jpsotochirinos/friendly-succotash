import { ref, watch } from 'vue';
import { apiClient } from '@/api/client';

interface SearchResult {
  id: string;
  title: string;
  filename: string;
  isTemplate: boolean;
  reviewStatus: string;
  rank: number;
  headline: string;
  trackableTitle?: string;
  folderName?: string;
  updatedAt: string;
}

export function useDocumentSearch() {
  const query = ref('');
  const results = ref<SearchResult[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const isTemplateOnly = ref(false);

  let debounceTimer: any;

  async function search(opts?: { trackableId?: string; excludeDocId?: string }) {
    if (!query.value.trim() && !isTemplateOnly.value) {
      results.value = [];
      total.value = 0;
      return;
    }

    loading.value = true;
    try {
      const params: any = {
        q: query.value,
        limit: 20,
      };

      if (isTemplateOnly.value) params.isTemplate = 'true';
      if (opts?.trackableId) params.trackableId = opts.trackableId;
      if (opts?.excludeDocId) params.excludeDocId = opts.excludeDocId;

      if (query.value.trim()) {
        const { data } = await apiClient.get('/search/documents', { params });
        results.value = data.data;
        total.value = data.total;
      } else {
        const { data } = await apiClient.get('/search/templates');
        results.value = data;
        total.value = data.length;
      }
    } finally {
      loading.value = false;
    }
  }

  function debouncedSearch(opts?: { trackableId?: string; excludeDocId?: string }) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(opts), 300);
  }

  async function findSimilar(documentId: string) {
    loading.value = true;
    try {
      const { data } = await apiClient.get(`/search/documents/${documentId}/similar`);
      results.value = data;
      total.value = data.length;
    } finally {
      loading.value = false;
    }
  }

  return {
    query, results, total, loading, isTemplateOnly,
    search, debouncedSearch, findSimilar,
  };
}
