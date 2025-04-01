import { redirect } from 'next/navigation';

export default function ChatIdPage() {
  // Redirect to the chat page when accessed directly
  redirect('/chat');
}