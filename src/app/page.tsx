export const dynamic = 'force-dynamic'
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-pink-500 text-white p-4">
        <h1 className="text-2xl font-bold">💄 BeautyBook</h1>
      </header>
      <div className="p-8 text-center">
        <p className="text-gray-500">サロン一覧を読み込み中...</p>
      </div>
    </div>
  )
}