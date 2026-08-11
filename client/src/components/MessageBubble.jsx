export default function MessageBubble({ role, content }) {
  const isCustomer = role === 'customer';
  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isCustomer
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
