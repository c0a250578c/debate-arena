/**
 * UserBadge - ヘッダー右端に表示するユーザー情報＋チケット残高＋購入ボタン.
 */
import { useAuth } from '../hooks/useAuth';
import { TICKET_SHOP_URL } from '../config';
import { IconScale } from './Icons';

export default function UserBadge() {
    const { user, logout, refresh } = useAuth();
    if (!user) return null;

    const shopUrl = user.shop_url || TICKET_SHOP_URL;

    const handleShop = () => {
        if (!shopUrl) return;
        // ユーザーIDをクエリに付与して購入サイトに遷移
        const url = new URL(shopUrl, window.location.origin);
        url.searchParams.set('user_id', String(user.id));
        window.open(url.toString(), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="user-badge">
            {user.picture
                ? <img src={user.picture} alt="" className="user-badge__avatar" />
                : <span className="user-badge__avatar user-badge__avatar--fallback">
                    {(user.name || user.email || '?')[0].toUpperCase()}
                </span>}
            <div className="user-badge__info">
                <span className="user-badge__name">{user.name || user.email}</span>
                <span
                    className={`user-badge__tickets ${user.ticket_balance === 0 ? 'user-badge__tickets--empty' : ''}`}
                    title="チケット残高"
                    onClick={refresh}
                    role="button"
                    tabIndex={0}
                >
                    <IconScale size={12} /> {user.ticket_balance}枚
                </span>
            </div>
            {shopUrl && (
                <button className="btn btn-ghost btn-sm user-badge__shop" onClick={handleShop}>
                    + 購入
                </button>
            )}
            <button className="btn btn-ghost btn-sm user-badge__logout" onClick={logout} aria-label="ログアウト">
                ログアウト
            </button>
        </div>
    );
}
