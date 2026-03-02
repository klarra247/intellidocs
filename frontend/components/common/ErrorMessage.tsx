interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-[13px] font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-[12px] font-medium text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
