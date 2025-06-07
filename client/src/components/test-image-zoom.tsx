import { ImageZoom } from "@/components/ui/image-zoom";

export default function TestImageZoom() {
  // Test with a simple base64 image
  const testImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzQzODVmNCIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VGVzdCBJbWFnZTwvdGV4dD4KPC9zdmc+";

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">이미지 줌 테스트</h3>
      <div className="flex gap-4 items-center">
        <ImageZoom
          src={testImage}
          alt="테스트 이미지"
          thumbnailClassName="w-20 h-20 border-2 border-blue-200"
        />
        <p className="text-sm text-slate-600">
          이 테스트 이미지를 클릭하면 큰 화면으로 볼 수 있어야 합니다.
        </p>
      </div>
    </div>
  );
}