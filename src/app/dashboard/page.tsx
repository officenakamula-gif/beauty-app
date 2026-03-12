'use client'
export const dynamic = 'force-dynamic'
import { sendEmail, emailTemplates } from '@/lib/email'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/areas'

const AREAS: Record<string, string[]> = {
    '東京': ['渋谷', '新宿', '銀座', '恵比寿', '表参道', '原宿', '六本木', '池袋', '品川', '上野', '秋葉原', '吉祥寺', '中目黒', '自由が丘', '代官山'],
    '神奈川': ['横浜', '川崎', '藤沢', '鎌倉', '相模原'],
    '大阪': ['梅田', '難波', '心斎橋', '天王寺', '堺'],
    '愛知': ['名古屋', '栄', '金山'],
    '福岡': ['博多', '天神', '小倉'],
    '北海道': ['札幌', 'すすきの'],
    '宮城': ['仙台'],
    '広島': ['広島市'],
    '京都': ['京都市'],
    '兵庫': ['神戸', '三宮'],
}

const GENRES = ['ヘアサロン', 'ネイル・まつげ', 'リラク・エステ']

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [salon, setSalon] = useState<any>(null)
    const [menus, setMenus] = useState<any[]>([])
    const [stylists, setStylists] = useState<any[]>([])
    const [reservations, setReservations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [tab, setTab] = useState<'salon' | 'menus' | 'stylists' | 'reservations'>('salon')

    const topImageRef = useRef<HTMLInputElement>(null)
    const galleryRef = useRef<HTMLInputElement>(null)

    const [salonForm, setSalonForm] = useState({
        name: '', genre: 'ヘアサロン', prefecture: '東京', area: '渋谷',
        address: '', nearest_station: '', description: '', phone: ''
    })
    const [menuForm, setMenuForm] = useState({ name: '', price: '', duration: '' })
    const [stylistForm, setStylistForm] = useState({
        name: '', role: '', experience_years: '', description: '', instagram: ''
    })
    const [stylistImageFile, setStylistImageFile] = useState<File | null>(null)
    const [stylistImagePreview, setStylistImagePreview] = useState('')

    useEffect(() => { init() }, [])

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth'); return }
        setUser(user)
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (prof?.role !== 'salon') { router.push('/'); return }
        const { data: salonData } = await supabase.from('salons').select('*').eq('owner_id', user.id).maybeSingle()
        if (salonData) {
            setSalon(salonData)
            const pref = Object.keys(REGIONS).flatMap(r =>
                Object.keys(REGIONS[r])
            ).find(p => REGIONS[p] && REGIONS[p] === salonData.area) || '東京'
            setSalonForm({
                name: salonData.name || '',
                genre: salonData.genre || 'ヘアサロン',
                prefecture: pref,
                area: salonData.area || '渋谷',
                address: salonData.address || '',
                nearest_station: salonData.nearest_station || '',
                description: salonData.description || '',
                phone: salonData.phone || ''
            })
            const { data: menuData } = await supabase.from('menus').select('*').eq('salon_id', salonData.id)
            setMenus(menuData || [])
            const { data: stylistData } = await supabase.from('stylists').select('*').eq('salon_id', salonData.id)
            setStylists(stylistData || [])
            const { data: resData } = await supabase.from('reservations')
                .select('*, menus(name, price)').eq('salon_id', salonData.id)
                .order('reserved_at', { ascending: false })
            setReservations(resData || [])
        }
        setLoading(false)
    }

    const uploadImage = async (file: File, path: string): Promise<string | null> => {
        const ext = file.name.split('.').pop()
        const fileName = `${path}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('salon-images').upload(fileName, file, { upsert: true })
        if (error) { alert('アップロード失敗: ' + error.message); return null }
        const { data } = supabase.storage.from('salon-images').getPublicUrl(fileName)
        return data.publicUrl
    }

    const handleTopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!salon || !e.target.files?.[0]) return
        setUploading(true)
        const url = await uploadImage(e.target.files[0], `salons/${salon.id}/top`)
        if (url) {
            await supabase.from('salons').update({ top_image: url }).eq('id', salon.id)
            setSalon({ ...salon, top_image: url })
            alert('✅ トップ画像を更新しました')
        }
        setUploading(false)
    }

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!salon || !e.target.files) return
        setUploading(true)
        const files = Array.from(e.target.files)
        const urls: string[] = []
        for (const file of files) {
            const url = await uploadImage(file, `salons/${salon.id}/gallery`)
            if (url) urls.push(url)
        }
        const newGallery = [...(salon.gallery_images || []), ...urls]
        await supabase.from('salons').update({ gallery_images: newGallery }).eq('id', salon.id)
        setSalon({ ...salon, gallery_images: newGallery })
        alert(`✅ ${urls.length}枚追加しました`)
        setUploading(false)
    }

    const deleteGalleryImage = async (url: string) => {
        if (!confirm('この画像を削除しますか？')) return
        const newGallery = (salon.gallery_images || []).filter((u: string) => u !== url)
        await supabase.from('salons').update({ gallery_images: newGallery }).eq('id', salon.id)
        setSalon({ ...salon, gallery_images: newGallery })
    }

    const saveSalon = async () => {
        if (!salonForm.name || !salonForm.area || !salonForm.address) {
            alert('サロン名・エリア・住所は必須です'); return
        }
        setSaving(true)
        const payload = {
            name: salonForm.name, genre: salonForm.genre, area: salonForm.area,
            address: salonForm.address, nearest_station: salonForm.nearest_station,
            description: salonForm.description, phone: salonForm.phone,
        }
        if (salon) {
            const { error } = await supabase.from('salons').update(payload).eq('id', salon.id)
            if (error) { alert('エラー: ' + error.message); setSaving(false); return }
            alert('✅ 更新しました')
        } else {
            const { data, error } = await supabase.from('salons')
                .insert({ ...payload, owner_id: user.id, is_active: true }).select().single()
            if (error) { alert('エラー: ' + error.message); setSaving(false); return }
            setSalon(data)
            alert('✅ サロンを登録しました')
        }
        setSaving(false)
        init()
    }

    const addMenu = async () => {
        if (!salon) { alert('先にサロン情報を保存してください'); return }
        if (!menuForm.name || !menuForm.price || !menuForm.duration) { alert('全項目入力してください'); return }
        const { error } = await supabase.from('menus').insert({
            salon_id: salon.id, name: menuForm.name,
            price: parseInt(menuForm.price), duration: parseInt(menuForm.duration)
        })
        if (error) { alert('エラー: ' + error.message); return }
        setMenuForm({ name: '', price: '', duration: '' })
        const { data } = await supabase.from('menus').select('*').eq('salon_id', salon.id)
        setMenus(data || [])
    }

    const deleteMenu = async (id: string) => {
        if (!confirm('削除しますか？')) return
        await supabase.from('menus').delete().eq('id', id)
        setMenus(menus.filter(m => m.id !== id))
    }

    const addStylist = async () => {
        if (!salon) { alert('先にサロン情報を保存してください'); return }
        if (!stylistForm.name) { alert('スタイリスト名は必須です'); return }
        setUploading(true)
        let imageUrl = null
        if (stylistImageFile) {
            imageUrl = await uploadImage(stylistImageFile, `salons/${salon.id}/stylists`)
        }
        const { error } = await supabase.from('stylists').insert({
            salon_id: salon.id, name: stylistForm.name, role: stylistForm.role,
            experience_years: stylistForm.experience_years ? parseInt(stylistForm.experience_years) : null,
            description: stylistForm.description, instagram: stylistForm.instagram, image_url: imageUrl,
        })
        if (error) { alert('エラー: ' + error.message); setUploading(false); return }
        setStylistForm({ name: '', role: '', experience_years: '', description: '', instagram: '' })
        setStylistImageFile(null)
        setStylistImagePreview('')
        const { data } = await supabase.from('stylists').select('*').eq('salon_id', salon.id)
        setStylists(data || [])
        setUploading(false)
        alert('✅ スタイリストを追加しました')
    }

    const deleteStylist = async (id: string) => {
        if (!confirm('削除しますか？')) return
        await supabase.from('stylists').delete().eq('id', id)
        setStylists(stylists.filter(s => s.id !== id))
    }

    const updateReservationStatus = async (id: string, status: string) => {
        await supabase.from('reservations').update({ status }).eq('id', id)
        setReservations(reservations.map(r => r.id === id ? { ...r, status } : r))

        // 対象の予約を取得
        const res = reservations.find(r => r.id === id)
        if (!res) return

        // ユーザーのメールを取得
        const { data: userProfile } = await supabase
            .from('profiles').select('username').eq('id', res.user_id).single()

        if (userProfile?.username && salon) {
            const dateStr = new Date(res.reserved_at).toLocaleString('ja-JP')
            if (status === 'confirmed') {
                await sendEmail(
                    userProfile.username,
                    ...Object.values(emailTemplates.reservationConfirmed(salon.name, res.menus?.name, dateStr)) as [string, string]
                )
            } else if (status === 'cancelled') {
                await sendEmail(
                    userProfile.username,
                    ...Object.values(emailTemplates.reservationCancelled(salon.name, 'cancelled')) as [string, string]
                )
            }
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-400">読み込み中...</p>
        </div>
    )

    const statusColor: any = {
        pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700', completed: 'bg-gray-100 text-gray-600'
    }
    const statusLabel: any = { pending: '未確認', confirmed: '確認済', cancelled: 'キャンセル', completed: '完了' }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-pink-500 text-white p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold">💅 サロン管理画面</h1>
                    <p className="text-xs opacity-75">{user?.email}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => router.push('/')}
                        className="text-xs bg-white text-pink-500 px-3 py-1 rounded-full font-bold">
                        🏠 トップへ戻る
                    </button>
                    <button onClick={async () => {
                        await supabase.auth.signOut()
                        router.push('/')
                    }} className="text-xs bg-pink-400 text-white px-3 py-1 rounded-full font-bold">
                        ログアウト
                    </button>
                </div>
            </header>

            <div className="flex border-b bg-white overflow-x-auto">
                {(['salon', 'menus', 'stylists', 'reservations'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex-1 py-3 text-xs font-bold whitespace-nowrap px-2 transition ${tab === t ? 'border-b-2 border-pink-500 text-pink-500' : 'text-gray-400'
                            }`}>
                        {t === 'salon' ? '🏪 サロン情報' : t === 'menus' ? '📋 メニュー' : t === 'stylists' ? '✂️ スタイリスト' : '📅 予約'}
                    </button>
                ))}
            </div>

            <div className="max-w-2xl mx-auto p-4">

                {/* サロン情報タブ */}
                {tab === 'salon' && (
                    <div className="space-y-4">
                        {salon && (
                            <div className="bg-white rounded-xl shadow p-4">
                                <h2 className="font-bold text-lg mb-3">📸 サロン画像</h2>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-600 block mb-2">トップ画像（1枚）</label>
                                    {salon.top_image && (
                                        <img src={salon.top_image} alt="トップ画像" className="w-full h-40 object-cover rounded-lg mb-2" />
                                    )}
                                    <button onClick={() => topImageRef.current?.click()} disabled={uploading}
                                        className="w-full border-2 border-dashed border-pink-300 text-pink-400 py-3 rounded-lg text-sm font-bold">
                                        {uploading ? 'アップロード中...' : salon.top_image ? '🔄 変更する' : '＋ トップ画像を追加'}
                                    </button>
                                    <input ref={topImageRef} type="file" accept="image/*" className="hidden" onChange={handleTopImageUpload} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-2">店内・サロン画像（複数可）</label>
                                    {(salon.gallery_images || []).length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            {(salon.gallery_images || []).map((url: string, i: number) => (
                                                <div key={i} className="relative">
                                                    <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                                                    <button onClick={() => deleteGalleryImage(url)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={() => galleryRef.current?.click()} disabled={uploading}
                                        className="w-full border-2 border-dashed border-pink-300 text-pink-400 py-3 rounded-lg text-sm font-bold">
                                        {uploading ? 'アップロード中...' : '＋ 画像を追加（複数選択可）'}
                                    </button>
                                    <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow p-4">
                            <h2 className="font-bold text-lg mb-4">サロン情報の{salon ? '編集' : '登録'}</h2>
                            <div className="mb-3">
                                <label className="text-xs font-bold text-gray-600">サロン名 *</label>
                                <input value={salonForm.name} onChange={e => setSalonForm({ ...salonForm, name: e.target.value })}
                                    placeholder="例：SALON de BEAUTÉ" className="w-full border rounded-lg p-2 mt-1 text-sm" />
                            </div>
                            <div className="mb-3">
                                <label className="text-xs font-bold text-gray-600">ジャンル *</label>
                                <select value={salonForm.genre} onChange={e => setSalonForm({ ...salonForm, genre: e.target.value })}
                                    className="w-full border rounded-lg p-2 mt-1 text-sm">
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="text-xs font-bold text-gray-600">都道府県 *</label>
                                <select value={salonForm.prefecture}
                                    onChange={e => setSalonForm({ ...salonForm, prefecture: e.target.value, area: AREAS[e.target.value][0] })}
                                    className="w-full border rounded-lg p-2 mt-1 text-sm">
                                    {Object.keys(REGIONS).map(region => (
                                        <optgroup key={region} label={region}>
                                            {Object.keys(REGIONS[region]).map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="text-xs font-bold text-gray-600">エリア *</label>
                                <select value={salonForm.area} onChange={e => setSalonForm({ ...salonForm, area: e.target.value })}
                                    className="w-full border rounded-lg p-2 mt-1 text-sm">
                                    {Object.values(REGIONS).flatMap(prefs =>
                                        prefs[salonForm.prefecture] || []
                                    ).map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            {[
                                { key: 'address', label: '住所 *', placeholder: '東京都渋谷区渋谷1-1-1' },
                                { key: 'nearest_station', label: '最寄り駅', placeholder: '渋谷駅' },
                                { key: 'phone', label: '電話番号', placeholder: '03-xxxx-xxxx' },
                            ].map(field => (
                                <div key={field.key} className="mb-3">
                                    <label className="text-xs font-bold text-gray-600">{field.label}</label>
                                    <input value={(salonForm as any)[field.key]}
                                        onChange={e => setSalonForm({ ...salonForm, [field.key]: e.target.value })}
                                        placeholder={field.placeholder} className="w-full border rounded-lg p-2 mt-1 text-sm" />
                                </div>
                            ))}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-600">説明文</label>
                                <textarea value={salonForm.description}
                                    onChange={e => setSalonForm({ ...salonForm, description: e.target.value })}
                                    placeholder="サロンの特徴・アピールポイント..."
                                    className="w-full border rounded-lg p-2 mt-1 text-sm h-24 resize-none" />
                            </div>
                            <button onClick={saveSalon} disabled={saving}
                                className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold disabled:opacity-50">
                                {saving ? '保存中...' : salon ? '✅ 更新する' : '✅ 登録する'}
                            </button>
                        </div>
                    </div>
                )}

                {/* メニュータブ */}
                {tab === 'menus' && (
                    <div>
                        <div className="bg-white rounded-xl shadow p-4 mb-4">
                            <h2 className="font-bold text-lg mb-3">メニューを追加</h2>
                            <input value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                                placeholder="メニュー名（例：カット＋カラー）" className="w-full border rounded-lg p-2 mb-2 text-sm" />
                            <div className="flex gap-2 mb-3">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">料金（円）</label>
                                    <input value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                                        placeholder="5000" type="number" className="w-full border rounded-lg p-2 text-sm" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">所要時間（分）</label>
                                    <input value={menuForm.duration} onChange={e => setMenuForm({ ...menuForm, duration: e.target.value })}
                                        placeholder="60" type="number" className="w-full border rounded-lg p-2 text-sm" />
                                </div>
                            </div>
                            <button onClick={addMenu} className="w-full bg-pink-500 text-white py-2 rounded-lg font-bold text-sm">＋ 追加する</button>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4">
                            <h2 className="font-bold text-lg mb-3">登録済みメニュー（{menus.length}件）</h2>
                            {menus.length === 0
                                ? <p className="text-gray-400 text-sm text-center py-4">メニューがまだありません</p>
                                : menus.map(menu => (
                                    <div key={menu.id} className="flex justify-between items-center p-3 border rounded-lg mb-2">
                                        <div>
                                            <p className="font-bold text-sm">{menu.name}</p>
                                            <p className="text-xs text-gray-500">¥{menu.price.toLocaleString()} / {menu.duration}分</p>
                                        </div>
                                        <button onClick={() => deleteMenu(menu.id)} className="text-red-400 text-xs px-2 py-1 border border-red-200 rounded">削除</button>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* スタイリストタブ */}
                {tab === 'stylists' && (
                    <div>
                        <div className="bg-white rounded-xl shadow p-4 mb-4">
                            <h2 className="font-bold text-lg mb-3">スタイリストを追加</h2>
                            <div className="mb-3 flex items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {stylistImagePreview
                                        ? <img src={stylistImagePreview} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-2xl">✂️</span>}
                                </div>
                                <button onClick={() => document.getElementById('stylist-image-input')?.click()}
                                    className="text-xs border border-pink-300 text-pink-500 px-3 py-2 rounded-lg">
                                    写真を選択
                                </button>
                                <input id="stylist-image-input" type="file" accept="image/*" className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            setStylistImageFile(file)
                                            setStylistImagePreview(URL.createObjectURL(file))
                                        }
                                    }} />
                            </div>
                            <input value={stylistForm.name} onChange={e => setStylistForm({ ...stylistForm, name: e.target.value })}
                                placeholder="名前 *" className="w-full border rounded-lg p-2 mb-2 text-sm" />
                            <input value={stylistForm.role} onChange={e => setStylistForm({ ...stylistForm, role: e.target.value })}
                                placeholder="役職（例：トップスタイリスト）" className="w-full border rounded-lg p-2 mb-2 text-sm" />
                            <input value={stylistForm.experience_years} onChange={e => setStylistForm({ ...stylistForm, experience_years: e.target.value })}
                                placeholder="経験年数" type="number" className="w-full border rounded-lg p-2 mb-2 text-sm" />
                            <input value={stylistForm.instagram} onChange={e => setStylistForm({ ...stylistForm, instagram: e.target.value })}
                                placeholder="Instagram ID（@なし）" className="w-full border rounded-lg p-2 mb-2 text-sm" />
                            <textarea value={stylistForm.description} onChange={e => setStylistForm({ ...stylistForm, description: e.target.value })}
                                placeholder="自己紹介・得意なスタイルなど" className="w-full border rounded-lg p-2 mb-3 text-sm h-20 resize-none" />
                            <button onClick={addStylist} disabled={uploading}
                                className="w-full bg-pink-500 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50">
                                {uploading ? 'アップロード中...' : '＋ 追加する'}
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4">
                            <h2 className="font-bold text-lg mb-3">登録済みスタイリスト（{stylists.length}人）</h2>
                            {stylists.length === 0
                                ? <p className="text-gray-400 text-sm text-center py-4">スタイリストがまだいません</p>
                                : stylists.map(s => (
                                    <div key={s.id} className="flex justify-between items-start p-3 border rounded-lg mb-2">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-full bg-pink-100 overflow-hidden flex-shrink-0">
                                                {s.image_url
                                                    ? <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center text-xl">✂️</div>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{s.name}</p>
                                                {s.role && <p className="text-xs text-pink-500">{s.role}</p>}
                                                {s.experience_years && <p className="text-xs text-gray-500">経験{s.experience_years}年</p>}
                                                {s.instagram && <p className="text-xs text-blue-400">@{s.instagram}</p>}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteStylist(s.id)} className="text-red-400 text-xs px-2 py-1 border border-red-200 rounded">削除</button>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* 予約一覧 */}
                {tab === 'reservations' && (
                    <div className="bg-white rounded-xl shadow p-4">
                        <h2 className="font-bold text-lg mb-3">予約一覧（{reservations.length}件）</h2>
                        {reservations.length === 0
                            ? <p className="text-gray-400 text-sm text-center py-4">予約がまだありません</p>
                            : reservations.map(res => (
                                <div key={res.id} className="p-3 border rounded-lg mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusColor[res.status]}`}>
                                            {statusLabel[res.status]}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(res.reserved_at).toLocaleString('ja-JP')}</span>
                                    </div>
                                    <p className="text-sm font-bold">{res.menus?.name}</p>
                                    <p className="text-xs text-gray-500">¥{res.menus?.price?.toLocaleString()}</p>
                                    {res.status === 'pending' && (
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => updateReservationStatus(res.id, 'confirmed')}
                                                className="flex-1 bg-green-100 text-green-700 text-xs py-1 rounded font-bold">✅ 確認する</button>
                                            <button onClick={() => updateReservationStatus(res.id, 'cancelled')}
                                                className="flex-1 bg-red-100 text-red-700 text-xs py-1 rounded font-bold">❌ キャンセル</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    )
}