import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <FileQuestion className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        The page you are looking for does not exist or you do not have permission to view it.
      </p>
      <Button asChild className="bg-[#0f1e35] hover:bg-[#1a2f4f]">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
