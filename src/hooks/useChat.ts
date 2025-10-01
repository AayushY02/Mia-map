import { useMutation } from '@tanstack/react-query';

type ChatResponse = {
  message: string;
};

export const useChatWithMirai = () => {
  return useMutation({
    mutationFn: async ({ context, question }: { context: any[]; question: string }) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, question }),
      });

      if (!res.ok) throw new Error('Failed to chat');

      const data: ChatResponse = await res.json(); // 👈 cast with type
      return data;
    }
  });
};
