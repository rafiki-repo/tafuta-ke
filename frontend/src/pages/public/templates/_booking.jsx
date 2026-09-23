/**
 * Shared booking & cart components for business website templates.
 * All orders/bookings are submitted via WhatsApp — no backend required.
 */
import { useState, useCallback } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2, MessageCircle, Calendar } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Cart hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCart() {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setItems(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.qty, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, addItem, updateQty, removeItem, clearCart, total, itemCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildOrderMessage(businessName, items, total) {
  const lines = [
    `Hello! I'd like to place an order from *${businessName}*`,
    "",
    "*Order Details:*",
    ...items.map(i => `• ${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}${i.price ? ` — KES ${(parseFloat(i.price) * i.qty).toLocaleString()}` : ""}`),
    total > 0 ? `\n*Total: KES ${total.toLocaleString()}*` : "",
    "",
    "Please confirm my order. Thank you!",
  ];
  return lines.filter(l => l !== null).join("\n");
}

function buildBookingMessage(businessName, serviceName, date, notes) {
  const lines = [
    `Hello! I'd like to book a service at *${businessName}*`,
    "",
    `*Service:* ${serviceName}`,
    date ? `*Preferred Date/Time:* ${date}` : null,
    notes ? `*Notes:* ${notes}` : null,
    "",
    "Please confirm my booking. Thank you!",
  ];
  return lines.filter(l => l !== null).join("\n");
}

function openWhatsApp(waNumber, message) {
  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking modal
// ─────────────────────────────────────────────────────────────────────────────

export function BookingModal({ service, businessName, waNumber, onClose }) {
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = buildBookingMessage(businessName, service.name, date, notes);
    openWhatsApp(waNumber, msg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Book Service</h3>
            <p className="text-sm text-gray-500 mt-0.5">{service.name}{service.price ? ` — KES ${service.price}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Preferred Date &amp; Time</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder="e.g. Friday 2pm"
                className="w-full rounded-lg border border-gray-200 bg-white text-sm py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special requests..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-bold text-sm active:scale-95 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            Send Booking on WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart drawer
// ─────────────────────────────────────────────────────────────────────────────

export function CartDrawer({ cart, businessName, waNumber, onClose }) {
  const { items, updateQty, removeItem, clearCart, total } = cart;

  const handleOrder = () => {
    if (!items.length) return;
    const msg = buildOrderMessage(businessName, items, total);
    openWhatsApp(waNumber, msg);
    clearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-sm h-[85vh] sm:h-full sm:min-h-screen flex flex-col shadow-2xl rounded-t-2xl sm:rounded-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">Your Cart</h3>
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-lg object-contain bg-gray-50 border shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                {item.price && (
                  <p className="text-xs text-gray-500">KES {(parseFloat(item.price) * item.qty).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, -1)}
                  className="h-7 w-7 rounded-full border flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-bold text-gray-800">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, 1)}
                  className="h-7 w-7 rounded-full border flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors ml-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        {total > 0 && (
          <div className="px-5 py-2 border-t border-b bg-gray-50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">KES {total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Checkout */}
        <div className="px-5 py-4">
          <button
            type="button"
            onClick={handleOrder}
            disabled={items.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            Send Order on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating cart button
// ─────────────────────────────────────────────────────────────────────────────

export function CartFab({ itemCount, onClick, className = "" }) {
  if (itemCount === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-20 right-4 md:bottom-6 z-40 flex items-center gap-2 bg-gray-900 text-white rounded-full shadow-lg pl-4 pr-3 py-2.5 font-semibold text-sm active:scale-95 transition-all hover:bg-gray-800 ${className}`}
    >
      <ShoppingCart className="h-4 w-4" />
      <span>Cart</span>
      <span className="bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{itemCount}</span>
    </button>
  );
}
