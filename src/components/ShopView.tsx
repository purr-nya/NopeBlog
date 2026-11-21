import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  CreditCard,
  Download,
  Minus,
  Package,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CartItem,
  LightboxSlide,
  Order,
  PaymentMethod,
  ShopProduct,
  UserProfile,
} from '../types/blog';
import { blogApi } from '../services/api';
import {
  computeCartPricing,
  formatPriceCny,
  FREE_SHIPPING_THRESHOLD_CENTS,
  validateCardLast4,
} from '../utils/shopLogic';

interface ShopViewProps {
  products: ShopProduct[];
  cartItems: CartItem[];
  currentUser: UserProfile | null;
  userToken: string | null;
  onAddToCart: (productId: string, variantId: string, quantity?: number) => void;
  onUpdateCartQty: (productId: string, variantId: string, quantity: number) => void;
  onRemoveCartItem: (productId: string, variantId: string) => void;
  onClearCart: () => void;
  onOrderCompleted: (order: Order, updatedProducts: ShopProduct[]) => void;
  onOrderRefunded: (order: Order, updatedProducts: ShopProduct[]) => void;
  onOpenLightbox: (slides: LightboxSlide[], index: number) => void;
  onOpenAccount: () => void;
}

type ShopCategoryFilter = 'all' | 'digital' | 'physical' | 'publication';
type DrawerStage = 'cart' | 'shipping' | 'payment' | 'receipt';

const CATEGORY_LABELS: Record<ShopCategoryFilter, string> = {
  all: '全部作品',
  digital: '数字资产',
  physical: '实体器物',
  publication: '摄影出版',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  alipay: '支付宝扫码',
  wechat: '微信支付',
  card: '银行卡支付',
};

function StylizedQrSvg({ seed, accent }: { seed: string; accent: string }) {
  // Deterministic crisp SVG QR pattern derived from orderNo for authentic gateway visuals
  const cells = useMemo(() => {
    const grid: boolean[] = [];
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    for (let idx = 0; idx < 121; idx++) {
      const r = Math.floor(idx / 11);
      const c = idx % 11;
      const inFinder =
        (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
      if (inFinder) {
        grid.push(true);
      } else {
        hash = Math.imul(hash ^ (idx + 17), 16777619);
        grid.push((hash & 3) !== 0);
      }
    }
    return grid;
  }, [seed]);

  return (
    <svg
      viewBox="0 0 110 110"
      className="w-36 h-36 mx-auto rounded-xl bg-white p-2 border border-black/10"
      aria-label={`支付二维码 ${seed}`}
    >
      {cells.map((filled, idx) => {
        if (!filled) return null;
        const r = Math.floor(idx / 11);
        const c = idx % 11;
        return (
          <rect
            key={idx}
            x={c * 10 + 1}
            y={r * 10 + 1}
            width="8"
            height="8"
            rx="1.5"
            fill={accent}
          />
        );
      })}
    </svg>
  );
}

export function ShopView({
  products,
  cartItems,
  currentUser,
  userToken,
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onOrderCompleted,
  onOrderRefunded,
  onOpenLightbox,
  onOpenAccount,
}: ShopViewProps) {
  const [category, setCategory] = useState<ShopCategoryFilter>('all');
  const [detailProduct, setDetailProduct] = useState<ShopProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStage, setDrawerStage] = useState<DrawerStage>('cart');

  // Coupon & Checkout Form
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponInput, setAppliedCouponInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // Payment Gateway State
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('alipay');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  // Guest Order Lookup Panel
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupOrderNo, setLookupOrderNo] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<Order | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.displayName);
      setCustomerEmail((prev) => prev || currentUser.email);
    }
  }, [currentUser]);

  const filteredProducts = useMemo(
    () =>
      category === 'all'
        ? products
        : products.filter((p) => p.category === category),
    [category, products]
  );

  const pricing = useMemo(
    () => computeCartPricing(cartItems, products, appliedCouponInput),
    [appliedCouponInput, cartItems, products]
  );

  const totalBagCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const openProductDetail = (product: ShopProduct) => {
    setDetailProduct(product);
    setSelectedVariantId(product.variants[0]?.id || '');
  };

  const handleQuickAdd = (product: ShopProduct) => {
    const firstAvailable = product.variants.find((v) => v.stock > 0) || product.variants[0];
    if (!firstAvailable) return;
    onAddToCart(product.id, firstAvailable.id, 1);
    setDrawerStage('cart');
    setDrawerOpen(true);
  };

  const handleApplyCoupon = () => {
    setAppliedCouponInput(couponInput.trim().toUpperCase());
  };

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setCheckoutError('请填写收件人/购买人姓名和电子邮箱');
      return;
    }
    if (pricing.hasPhysicalItems && (!customerPhone.trim() || !shippingAddress.trim())) {
      setCheckoutError('订单包含实体商品，请填写联系电话与收货地址');
      return;
    }

    setCheckoutBusy(true);
    try {
      const { order } = await blogApi.createOrder(
        {
          items: cartItems,
          couponCode: pricing.appliedCoupon?.code,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          note: orderNote.trim() || undefined,
        },
        userToken
      );
      setActiveOrder(order);
      setDrawerStage('payment');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : '订单创建失败');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handlePayOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setCheckoutError(null);

    if (paymentMethod === 'card') {
      const check = validateCardLast4(cardNumber);
      if (!check.valid) {
        setCheckoutError('请输入有效的 12-19 位银行卡号（系统仅留存后 4 位用于对账）');
        return;
      }
    }

    setCheckoutBusy(true);
    try {
      const { order, products: updatedProducts } = await blogApi.payOrder(
        activeOrder.id,
        {
          paymentMethod,
          customerEmail: activeOrder.customerEmail,
          cardHolder: paymentMethod === 'card' ? cardHolder.trim() || activeOrder.customerName : undefined,
          cardNumber: paymentMethod === 'card' ? cardNumber : undefined,
        },
        userToken
      );
      setActiveOrder(order);
      setCardNumber('');
      onClearCart();
      onOrderCompleted(order, updatedProducts);
      setDrawerStage('receipt');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : '支付确认失败');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleRefundActiveOrder = async () => {
    if (!activeOrder) return;
    setRefunding(true);
    setCheckoutError(null);
    try {
      const { order, products: updatedProducts } = await blogApi.refundOrder(
        activeOrder.id,
        activeOrder.customerEmail,
        userToken
      );
      setActiveOrder(order);
      onOrderRefunded(order, updatedProducts);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : '退款失败');
    } finally {
      setRefunding(false);
    }
  };

  const handleLookupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    if (!lookupOrderNo.trim() || !lookupEmail.trim()) {
      setLookupError('请输入订单编号与下单邮箱');
      return;
    }
    setLookupBusy(true);
    try {
      const { order } = await blogApi.lookupOrder(lookupOrderNo.trim(), lookupEmail.trim());
      setLookupResult(order);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : '未找到对应订单');
    } finally {
      setLookupBusy(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  const detailVariant =
    detailProduct?.variants.find((v) => v.id === selectedVariantId) ||
    detailProduct?.variants[0];

  return (
    <div className="space-y-6">
      {/* Storefront Header & Controls */}
      <section className="m3-card p-6 sm:p-8 fuwari-onload">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-xs font-medium text-[var(--md-primary)]">
              晴风造物小铺 · 独立创作周边与数字资产
            </div>
            <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
              把设计与光影，带回你的日常桌面
            </h1>
            <p className="mt-2 text-sm text-[var(--md-on-surface-variant)] leading-relaxed">
              数字作品支付即刻生成专属授权码并开放下载；实体器物满{' '}
              <span className="tabular-nums font-medium text-[var(--md-on-surface)]">
                {formatPriceCny(FREE_SHIPPING_THRESHOLD_CENTS)}
              </span>{' '}
              包邮。结算可使用读者礼遇码 <code className="font-mono text-[var(--md-primary)]">KAZE10</code>（九折）或{' '}
              <code className="font-mono text-[var(--md-primary)]">FUWARI20</code>（满百减二十）。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLookupOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>查询订单</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawerStage(activeOrder && drawerStage === 'receipt' ? 'receipt' : 'cart');
                setDrawerOpen(true);
              }}
              aria-label={`打开购物袋，当前 ${totalBagCount} 件商品`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">购物袋 ({totalBagCount})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[var(--md-outline-variant)]/70">
          <div
            role="tablist"
            aria-label="商品分类筛选"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
          >
            {(Object.keys(CATEGORY_LABELS) as ShopCategoryFilter[]).map((key) => {
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(key)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                      : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  {CATEGORY_LABELS[key]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenAccount}
            className="text-xs text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary)] transition-colors cursor-pointer"
          >
            {currentUser
              ? `已登录会员：${currentUser.displayName}（查看历史订单）`
              : '登录会员账号，自动关联订单与数字授权'}
          </button>
        </div>

        {/* Inline Guest Order Lookup Panel */}
        {lookupOpen && (
          <div className="mt-5 p-5 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[var(--md-on-surface)]">
                订单状态与数字授权查询
              </h2>
              <button
                type="button"
                onClick={() => setLookupOpen(false)}
                aria-label="收起查询面板"
                className="text-xs text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] cursor-pointer"
              >
                收起
              </button>
            </div>
            <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={lookupOrderNo}
                onChange={(e) => setLookupOrderNo(e.target.value)}
                placeholder="订单编号（如 KZ2026...）"
                aria-label="订单编号"
                className="px-3.5 py-2 text-xs font-mono rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
              />
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="下单时填写的邮箱"
                aria-label="下单邮箱"
                className="px-3.5 py-2 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
              />
              <button
                type="submit"
                disabled={lookupBusy}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
              >
                {lookupBusy ? '查询中...' : '立即查询'}
              </button>
            </form>
            {lookupError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {lookupError}
              </p>
            )}
            {lookupResult && (
              <div className="p-4 rounded-xl bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)]/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-mono font-semibold text-[var(--md-on-surface)]">
                    {lookupResult.orderNo} · 状态：{lookupResult.status}
                  </div>
                  <div className="mt-1 text-[var(--md-on-surface-variant)]">
                    实付 {formatPriceCny(lookupResult.totalCents)} · 共 {lookupResult.items.length} 项商品
                    {lookupResult.trackingNumber ? ` · 物流单号 ${lookupResult.trackingNumber}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOrder(lookupResult);
                    setDrawerStage(
                      lookupResult.status === 'pending_payment' ? 'payment' : 'receipt'
                    );
                    setDrawerOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-medium cursor-pointer"
                >
                  查看详情与交付
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Uniform Product Grid (3 cols desktop / 2 cols tablet / 1 col mobile) */}
      <section
        aria-label="商店商品列表"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        {filteredProducts.map((product, index) => {
          const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
          return (
            <article
              key={product.id}
              style={{ ['--stagger' as string]: Math.min(index + 1, 8) }}
              className="m3-card m3-card-interactive fuwari-onload overflow-hidden flex flex-col group"
            >
              {/* Clean 4:3 Studio Image */}
              <button
                type="button"
                onClick={() => openProductDetail(product)}
                aria-label={`查看商品详情：${product.title}`}
                className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--md-surface-container-high)] cursor-pointer text-left"
              >
                <img
                  src={product.image}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              </button>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-xs text-[var(--md-on-surface-variant)]">
                    <span className="text-[var(--md-primary)] font-medium">
                      {product.type === 'digital' ? '数字即时交付' : '顺丰实体寄送'}
                    </span>
                    {product.badgeText && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{product.badgeText}</span>
                      </>
                    )}
                    <span aria-hidden="true"> · </span>
                    <span className="tabular-nums">已售 {product.salesCount}</span>
                  </div>

                  <h2 className="mt-2 font-display text-lg font-bold text-[var(--md-on-surface)] group-hover:text-[var(--md-primary)] transition-colors">
                    <button
                      type="button"
                      onClick={() => openProductDetail(product)}
                      className="text-left cursor-pointer"
                    >
                      {product.title}
                    </button>
                  </h2>

                  <p className="mt-1.5 text-xs sm:text-[13.5px] text-[var(--md-on-surface-variant)] line-clamp-2 leading-relaxed">
                    {product.subtitle}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-[var(--md-outline-variant)]/60 flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold tabular-nums text-[var(--md-on-surface)]">
                      {formatPriceCny(product.priceCents)}
                    </span>
                    {product.originalPriceCents && (
                      <span className="text-xs line-through tabular-nums text-[var(--md-on-surface-variant)] opacity-70">
                        {formatPriceCny(product.originalPriceCents)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={totalStock <= 0}
                    onClick={() => handleQuickAdd(product)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-primary)] hover:text-[var(--md-on-primary)] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{totalStock > 0 ? '加入购物袋' : '已售罄'}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Product Detail Modal (Portaled to document.body) */}
      {detailProduct &&
        detailVariant &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detailProduct.title}
            onClick={() => setDetailProduct(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fuwari-modal-enter w-full max-w-4xl rounded-[var(--radius-card)] bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] shadow-2xl overflow-hidden my-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Left Product Gallery */}
              <div className="md:col-span-6 bg-[var(--md-surface-container-low)] p-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onOpenLightbox(
                      detailProduct.gallery.map((src, i) => ({
                        src,
                        title: detailProduct.title,
                        caption: detailProduct.subtitle,
                        meta: `${i + 1}/${detailProduct.gallery.length} · ${formatPriceCny(detailVariant.priceCents)}`,
                      })),
                      0
                    )
                  }
                  aria-label="在独立灯箱中放大查看商品图"
                  className="aspect-[4/3] w-full rounded-[var(--radius-inner)] overflow-hidden bg-[var(--md-surface-container-high)] cursor-zoom-in"
                >
                  <img
                    src={detailProduct.image}
                    alt={detailProduct.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="text-xs text-[var(--md-on-surface-variant)] text-center">
                  点击商品图片可在独立灯箱中高清放大查看细节
                </div>
              </div>

              {/* Right Details & Variants */}
              <div className="md:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-[var(--md-primary)]">
                        {detailProduct.type === 'digital' ? '数字资产 · 即时发码' : '实体周边 · 包装发货'}
                        {' · '}已售 <span className="tabular-nums">{detailProduct.salesCount}</span>
                      </div>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[var(--md-on-surface)]">
                        {detailProduct.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailProduct(null)}
                      aria-label="关闭商品详情"
                      className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm leading-relaxed text-[var(--md-on-surface-variant)]">
                    {detailProduct.description}
                  </p>

                  {/* Variant Picker */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--md-on-surface)]">
                      选择版本规格
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.variants.map((variant) => {
                        const selected = variant.id === detailVariant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={`px-3.5 py-2 text-xs rounded-[var(--radius-control)] border transition-colors cursor-pointer ${
                              selected
                                ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-semibold'
                                : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] hover:border-[var(--md-primary)]/50'
                            }`}
                          >
                            {variant.name} ·{' '}
                            <span className="tabular-nums">{formatPriceCny(variant.priceCents)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                      当前规格库存：{detailVariant.stock} 件
                      {detailProduct.digitalPreviewNote
                        ? ` · ${detailProduct.digitalPreviewNote}`
                        : ''}
                    </div>
                  </div>

                  {/* Specs Table */}
                  <dl className="grid grid-cols-1 gap-2 p-3.5 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] text-xs">
                    {detailProduct.specs.map((spec) => (
                      <div key={spec.label} className="flex items-baseline justify-between gap-4">
                        <dt className="text-[var(--md-on-surface-variant)] shrink-0">
                          {spec.label}
                        </dt>
                        <dd className="text-[var(--md-on-surface)] font-medium text-right">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Price & Purchase CTAs */}
                <div className="pt-4 border-t border-[var(--md-outline-variant)]/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-display text-2xl font-bold tabular-nums text-[var(--md-on-surface)]">
                    {formatPriceCny(detailVariant.priceCents)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={detailVariant.stock <= 0}
                      onClick={() => {
                        onAddToCart(detailProduct.id, detailVariant.id, 1);
                        setDetailProduct(null);
                        setDrawerStage('cart');
                        setDrawerOpen(true);
                      }}
                      className="px-4 py-2.5 text-xs sm:text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] cursor-pointer"
                    >
                      加入购物袋
                    </button>
                    <button
                      type="button"
                      disabled={detailVariant.stock <= 0}
                      onClick={() => {
                        onAddToCart(detailProduct.id, detailVariant.id, 1);
                        setDetailProduct(null);
                        setDrawerStage('shipping');
                        setDrawerOpen(true);
                      }}
                      className="px-5 py-2.5 text-xs sm:text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 cursor-pointer"
                    >
                      立即购买
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}

      {/* Slide-Over Shopping Bag & Complete Payment Pipeline Drawer (Portaled to document.body) */}
      {drawerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="购物袋与支付结算"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex justify-end"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fuwari-drawer-enter w-full max-w-md h-full bg-[var(--md-surface-container-lowest)] border-l border-[var(--md-outline-variant)] shadow-2xl flex flex-col"
          >
            {/* Drawer Top Bar */}
            <div className="px-5 py-4 border-b border-[var(--md-outline-variant)]/80 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                  {drawerStage === 'cart' && `购物袋 (${totalBagCount})`}
                  {drawerStage === 'shipping' && '填写收货与联系信息'}
                  {drawerStage === 'payment' && '安全收银台'}
                  {drawerStage === 'receipt' && '订单已支付与资产交付'}
                </h2>
                <div className="text-xs text-[var(--md-on-surface-variant)]">
                  {drawerStage === 'cart' && '支持优惠码实时核验与服务端计价'}
                  {drawerStage === 'shipping' && '步骤 2 / 3 · 提交后锁定库存生成订单'}
                  {drawerStage === 'payment' && '步骤 3 / 3 · 选择支付通道并完成核验'}
                  {drawerStage === 'receipt' && '服务端已完成记账与库存扣减'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭结算抽屉"
                className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* STAGE 1: CART */}
              {drawerStage === 'cart' && (
                <>
                  {pricing.items.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <ShoppingBag className="w-10 h-10 mx-auto text-[var(--md-on-surface-variant)] opacity-45" />
                      <p className="text-sm text-[var(--md-on-surface-variant)]">
                        购物袋还是空的，挑一件喜欢的设计或出版物吧。
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {pricing.items.map((item) => (
                          <div
                            key={`${item.productId}-${item.variantId}`}
                            className="p-3.5 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] flex gap-3.5"
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[var(--md-outline-variant)]/60"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-[var(--md-on-surface)] truncate">
                                {item.title}
                              </div>
                              <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                                {item.variantName} ·{' '}
                                <span className="tabular-nums font-medium text-[var(--md-on-surface)]">
                                  {formatPriceCny(item.unitPriceCents)}
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center justify-between">
                                <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--md-surface-container)] p-0.5">
                                  <button
                                    type="button"
                                    aria-label={`减少 ${item.title} 数量`}
                                    onClick={() =>
                                      onUpdateCartQty(
                                        item.productId,
                                        item.variantId,
                                        item.quantity - 1
                                      )
                                    }
                                    className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-[var(--md-surface-container-high)] cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-7 text-center text-xs font-mono tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`增加 ${item.title} 数量`}
                                    onClick={() =>
                                      onUpdateCartQty(
                                        item.productId,
                                        item.variantId,
                                        item.quantity + 1
                                      )
                                    }
                                    className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-[var(--md-surface-container-high)] cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  aria-label={`移除 ${item.title}`}
                                  onClick={() => onRemoveCartItem(item.productId, item.variantId)}
                                  className="p-1.5 text-[var(--md-on-surface-variant)] hover:text-red-500 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Promo / Coupon Input */}
                      <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]/70">
                        <label
                          htmlFor="shop-coupon-input"
                          className="text-xs font-medium text-[var(--md-on-surface-variant)] flex items-center gap-1.5"
                        >
                          <Tag className="w-3.5 h-3.5 text-[var(--md-primary)]" />
                          <span>优惠码（KAZE10 / FUWARI20）</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="shop-coupon-input"
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            placeholder="输入优惠码..."
                            className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] cursor-pointer"
                          >
                            核验应用
                          </button>
                        </div>
                        {pricing.appliedCoupon && (
                          <p className="text-xs text-[var(--md-primary)] font-medium">
                            已生效：{pricing.appliedCoupon.code}（{pricing.appliedCoupon.label}）
                          </p>
                        )}
                        {pricing.couponError && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {pricing.couponError}
                          </p>
                        )}
                      </div>

                      {/* Pricing Summary */}
                      <dl className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] space-y-2 text-xs">
                        <div className="flex justify-between">
                          <dt className="text-[var(--md-on-surface-variant)]">商品小计</dt>
                          <dd className="tabular-nums font-medium">
                            {formatPriceCny(pricing.subtotalCents)}
                          </dd>
                        </div>
                        {pricing.discountCents > 0 && (
                          <div className="flex justify-between text-[var(--md-primary)]">
                            <dt>优惠抵扣</dt>
                            <dd className="tabular-nums font-medium">
                              -{formatPriceCny(pricing.discountCents)}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-[var(--md-on-surface-variant)]">运费</dt>
                          <dd className="tabular-nums font-medium">
                            {pricing.shippingCents === 0
                              ? '免运费'
                              : formatPriceCny(pricing.shippingCents)}
                          </dd>
                        </div>
                        <div className="pt-2 border-t border-[var(--md-outline-variant)]/70 flex justify-between text-sm font-bold text-[var(--md-on-surface)]">
                          <dt>应付总额</dt>
                          <dd className="tabular-nums font-display">
                            {formatPriceCny(pricing.totalCents)}
                          </dd>
                        </div>
                      </dl>
                    </>
                  )}
                </>
              )}

              {/* STAGE 2: CUSTOMER & SHIPPING INFO */}
              {drawerStage === 'shipping' && (
                <form id="shop-shipping-form" onSubmit={handleCreateOrder} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="chk-name"
                      className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1"
                    >
                      收件人 / 购买人姓名 *
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="你的称呼"
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="chk-email"
                      className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1"
                    >
                      电子邮箱 *（用于数字授权码交付与订单查询）
                    </label>
                    <input
                      id="chk-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>

                  {pricing.hasPhysicalItems && (
                    <>
                      <div>
                        <label
                          htmlFor="chk-phone"
                          className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1"
                        >
                          联系电话 *（实体快递配送）
                        </label>
                        <input
                          id="chk-phone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="138 0000 0000"
                          className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chk-address"
                          className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1"
                        >
                          详细收货地址 *
                        </label>
                        <textarea
                          id="chk-address"
                          rows={2}
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="省 / 市 / 区 / 街道门牌号"
                          className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label
                      htmlFor="chk-note"
                      className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1"
                    >
                      订单备注（选填）
                    </label>
                    <input
                      id="chk-note"
                      type="text"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="例如：希望附带手写签名卡"
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>

                  <div className="p-3.5 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] flex items-center justify-between text-xs">
                    <span className="text-[var(--md-on-surface-variant)]">
                      服务端核价总额（含 {pricing.items.length} 项）
                    </span>
                    <span className="font-display text-base font-bold tabular-nums text-[var(--md-on-surface)]">
                      {formatPriceCny(pricing.totalCents)}
                    </span>
                  </div>

                  {checkoutError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {checkoutError}
                    </p>
                  )}
                </form>
              )}

              {/* STAGE 3: PAYMENT GATEWAY */}
              {drawerStage === 'payment' && activeOrder && (
                <form id="shop-payment-form" onSubmit={handlePayOrder} className="space-y-4">
                  <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-primary-container)]/75 text-[var(--md-on-primary-container)] flex items-center justify-between">
                    <div>
                      <div className="text-xs opacity-80 font-mono">{activeOrder.orderNo}</div>
                      <div className="mt-0.5 text-xs">待支付订单总额</div>
                    </div>
                    <div className="font-display text-2xl font-bold tabular-nums">
                      {formatPriceCny(activeOrder.totalCents)}
                    </div>
                  </div>

                  {/* Selectable Payment Rails */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--md-on-surface)]">
                      选择支付通道
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'alipay', label: '支付宝', icon: QrCode },
                          { id: 'wechat', label: '微信支付', icon: QrCode },
                          { id: 'card', label: '银行卡', icon: CreditCard },
                        ] as const
                      ).map((rail) => {
                        const Icon = rail.icon;
                        const active = paymentMethod === rail.id;
                        return (
                          <button
                            key={rail.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(rail.id);
                              setCheckoutError(null);
                            }}
                            className={`py-2.5 px-2 rounded-[var(--radius-control)] border text-xs font-medium inline-flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                              active
                                ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                                : 'border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{rail.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rail Specific UI */}
                  {paymentMethod === 'alipay' || paymentMethod === 'wechat' ? (
                    <div className="p-5 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] text-center space-y-3">
                      <StylizedQrSvg
                        seed={`${activeOrder.orderNo}-${paymentMethod}`}
                        accent={paymentMethod === 'alipay' ? '#1677ff' : '#07c160'}
                      />
                      <div className="text-xs text-[var(--md-on-surface)] font-medium">
                        请使用 {PAYMENT_LABELS[paymentMethod]} 扫描二维码完成付款
                      </div>
                      <p className="text-[11.5px] text-[var(--md-on-surface-variant)]">
                        点击下方“确认已完成支付”将触发服务端实付核验、库存扣减与数字授权码签发。
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] space-y-3">
                      <div>
                        <label
                          htmlFor="pay-card-holder"
                          className="block text-xs text-[var(--md-on-surface-variant)] mb-1"
                        >
                          持卡人姓名
                        </label>
                        <input
                          id="pay-card-holder"
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder={activeOrder.customerName}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pay-card-number"
                          className="block text-xs text-[var(--md-on-surface-variant)] mb-1"
                        >
                          银行卡号（服务端脱敏仅保留后 4 位）
                        </label>
                        <input
                          id="pay-card-number"
                          type="text"
                          inputMode="numeric"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="6222 0200 1234 5678"
                          className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-[var(--md-on-surface-variant)]">
                    <ShieldCheck className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
                    <span>价格由服务端按商品目录实时重算，不采信前端篡改金额。</span>
                  </div>

                  {checkoutError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {checkoutError}
                    </p>
                  )}
                </form>
              )}

              {/* STAGE 4: PAID RECEIPT & DIGITAL DELIVERY */}
              {drawerStage === 'receipt' && activeOrder && (
                <div className="space-y-4">
                  <div className="p-5 rounded-[var(--radius-inner)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] space-y-2">
                    <div className="flex items-center gap-2 font-display font-bold text-base">
                      <Sparkles className="w-5 h-5" />
                      <span>
                        {activeOrder.status === 'refunded'
                          ? '该订单已原路退款并回补库存'
                          : '支付成功 · 订单已完成核验'}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums opacity-90">
                      订单号：{activeOrder.orderNo}
                    </div>
                    {activeOrder.paymentReference && (
                      <div className="text-xs font-mono opacity-85">
                        支付流水：{activeOrder.paymentReference}
                        {activeOrder.cardLast4 ? ` (尾号 ${activeOrder.cardLast4})` : ''}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {activeOrder.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-[var(--md-on-surface)]">
                              {item.title}
                            </div>
                            <div className="text-xs text-[var(--md-on-surface-variant)]">
                              {item.variantName} × {item.quantity}
                            </div>
                          </div>
                          <span className="font-mono text-xs tabular-nums font-semibold">
                            {formatPriceCny(item.unitPriceCents * item.quantity)}
                          </span>
                        </div>

                        {item.digitalLicenseKey && activeOrder.status !== 'refunded' && (
                          <div className="p-3 rounded-xl bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)]/70 space-y-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono font-semibold text-[var(--md-primary)]">
                                {item.digitalLicenseKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleCopyKey(item.digitalLicenseKey!)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
                              >
                                {copiedKey === item.digitalLicenseKey ? (
                                  <Check className="w-3 h-3 text-[var(--md-primary)]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>
                                  {copiedKey === item.digitalLicenseKey ? '已复制' : '复制授权码'}
                                </span>
                              </button>
                            </div>
                            <a
                              href={`/api/orders/${encodeURIComponent(activeOrder.id)}/download/${encodeURIComponent(item.productId)}?email=${encodeURIComponent(activeOrder.customerEmail)}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-[var(--md-primary)] text-[var(--md-on-primary)]"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>下载数字交付包 ({item.digitalFileName || 'manifest.txt'})</span>
                            </a>
                          </div>
                        )}

                        {item.type === 'physical' && activeOrder.status !== 'refunded' && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--md-on-surface-variant)]">
                            <Package className="w-3.5 h-3.5 text-[var(--md-primary)]" />
                            <span>
                              {activeOrder.trackingNumber
                                ? `已发出 · 物流单号：${activeOrder.trackingNumber}`
                                : `待打包寄送至：${activeOrder.shippingAddress}`}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {checkoutError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {checkoutError}
                    </p>
                  )}

                  {activeOrder.status !== 'refunded' && (
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-[var(--md-on-surface-variant)]">
                        可凭订单号与邮箱随时复查或申请退款
                      </span>
                      <button
                        type="button"
                        disabled={refunding}
                        onClick={() => void handleRefundActiveOrder()}
                        className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{refunding ? '退款中...' : '申请退款'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer CTA */}
            <div className="p-5 border-t border-[var(--md-outline-variant)]/80 bg-[var(--md-surface-container-low)]/50">
              {drawerStage === 'cart' && (
                <button
                  type="button"
                  disabled={pricing.items.length === 0}
                  onClick={() => {
                    setCheckoutError(null);
                    setDrawerStage('shipping');
                  }}
                  className="w-full py-3 text-sm font-semibold rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 disabled:opacity-45 transition-opacity cursor-pointer"
                >
                  前往填写信息 · {formatPriceCny(pricing.totalCents)}
                </button>
              )}

              {drawerStage === 'shipping' && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDrawerStage('cart')}
                    className="px-4 py-3 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
                  >
                    返回购物袋
                  </button>
                  <button
                    type="submit"
                    form="shop-shipping-form"
                    disabled={checkoutBusy}
                    className="flex-1 py-3 text-sm font-semibold rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 disabled:opacity-60 cursor-pointer"
                  >
                    {checkoutBusy ? '正在锁定库存...' : '创建订单并前往收银台'}
                  </button>
                </div>
              )}

              {drawerStage === 'payment' && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDrawerStage('shipping')}
                    className="px-4 py-3 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
                  >
                    修改信息
                  </button>
                  <button
                    type="submit"
                    form="shop-payment-form"
                    disabled={checkoutBusy}
                    className="flex-1 py-3 text-sm font-semibold rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 disabled:opacity-60 cursor-pointer"
                  >
                    {checkoutBusy ? '正在核验支付...' : '确认已完成支付'}
                  </button>
                </div>
              )}

              {drawerStage === 'receipt' && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-3 text-sm font-semibold rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                >
                  完成并返回商店
                </button>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
