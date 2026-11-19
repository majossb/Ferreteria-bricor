import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/currency';
import { getWelcome, getReply } from '../../data/chatbot';

/**
 * Asistente virtual de BRICOR.*/

const MAX_LENGTH = 200;
const TYPING_DELAY_MS = 450;

let messageCounter = 0;
const makeMessage = (role, payload) => ({ id: ++messageCounter, role, ...payload });

export default function ChatWidget({ onNavigate, onSelectCategory, onViewProduct, onSearch }) {
  const cart = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [makeMessage('bot', getWelcome())]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Mantener visible el último mensaje
  useEffect(() => {
    if (isOpen && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  // Enfocar el campo al abrir
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Limpiar el temporizador al desmontar
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const send = useCallback((raw) => {
    const text = String(raw).trim().slice(0, MAX_LENGTH);
    if (!text || isTyping) return;
    setMessages((prev) => [...prev, makeMessage('user', { text })]);
    setInput('');
    setIsTyping(true);
    timerRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, makeMessage('bot', getReply(text, { cart }))]);
      setIsTyping(false);
    }, TYPING_DELAY_MS);
  }, [cart, isTyping]);

  // En pantallas pequeñas el panel tapa la página: se cierra al navegar.
  const closeOnSmallScreens = () => {
    if (window.matchMedia?.('(max-width: 640px)').matches) setIsOpen(false);
  };

  const runAction = (action) => {
    switch (action.type) {
      case 'product': onViewProduct?.(action.id); break;
      case 'category': onSelectCategory?.(action.id); break;
      case 'page': onNavigate?.(action.page); break;
      case 'search': onSearch?.(action.query); break;
      case 'openCart': cart.openDrawer(); break;
      default: return;
    }
    closeOnSmallScreens();
  };

  const handleQuick = (quick) => {
    if (quick.send) send(quick.send);
    else if (quick.action) runAction(quick.action);
  };

  const lastBotId = [...messages].reverse().find((m) => m.role === 'bot')?.id;

  return (
    <div className="bricor-chat">
      {isOpen && (
        <section
          className="uk-card uk-card-default bricor-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Asistente virtual BRICOR"
        >
          <header className="uk-card-header uk-flex uk-flex-middle uk-flex-between bricor-chat-header">
            <div>
              <h2 className="bricor-chat-title">Asistente BRICOR</h2>
              <span className="uk-text-meta">Respuestas automáticas</span>
            </div>
            <button
              type="button"
              className="bricor-chat-close"
              aria-label="Cerrar asistente"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="bricor-chat-messages" ref={listRef} aria-live="polite">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`uk-flex ${m.role === 'user' ? 'uk-flex-right' : 'uk-flex-left'}`}
              >
                <div className={`bricor-chat-bubble bricor-chat-bubble-${m.role}`}>
                  <p className="bricor-chat-text">{m.text}</p>

                  {m.products?.length > 0 && (
                    <ul className="uk-list bricor-chat-products">
                      {m.products.map((p) => (
                        <li key={p.id} className="uk-card uk-card-default uk-card-small uk-card-body bricor-chat-product">
                          <span className="uk-text-meta">{p.brand} · {p.categoryName}</span>
                          <h3 className="bricor-chat-product-name">{p.name}</h3>
                          <div className="uk-flex uk-flex-middle uk-flex-between uk-flex-wrap">
                            <div>
                              <strong className="bricor-chat-price">{formatCurrency(p.price)}</strong>
                              {p.isPromo && p.originalPrice > p.price && (
                                <s className="uk-text-meta bricor-chat-old-price">{formatCurrency(p.originalPrice)}</s>
                              )}
                            </div>
                            <span className={`uk-label ${p.inStock ? 'bricor-chat-label-ok' : 'bricor-chat-label-out'}`}>
                              {p.inStock ? 'Disponible' : 'Agotado'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="uk-button uk-button-default uk-button-small bricor-chat-see"
                            onClick={() => runAction({ type: 'product', id: p.id })}
                          >
                            Ver producto
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {m.id === lastBotId && m.quick?.length > 0 && (
                    <div className="uk-flex uk-flex-wrap bricor-chat-quick">
                      {m.quick.map((quick) => (
                        <button
                          key={quick.label}
                          type="button"
                          className="uk-button uk-button-default uk-button-small"
                          onClick={() => handleQuick(quick)}
                        >
                          {quick.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="uk-flex uk-flex-left">
                <div className="bricor-chat-bubble bricor-chat-bubble-bot" role="status" aria-label="El asistente está escribiendo">
                  <span data-uk-spinner="ratio: 0.6" />
                </div>
              </div>
            )}
          </div>

          <footer className="uk-card-footer bricor-chat-footer">
            <form
              className="uk-flex bricor-chat-form"
              onSubmit={(e) => { e.preventDefault(); send(input); }}
            >
              <input
                ref={inputRef}
                className="uk-input uk-flex-1"
                type="text"
                value={input}
                maxLength={MAX_LENGTH}
                autoComplete="off"
                placeholder="Escribe tu pregunta…"
                aria-label="Escribe tu pregunta"
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="uk-button uk-button-primary"
                aria-label="Enviar mensaje"
                disabled={!input.trim() || isTyping}
              >
                <Send size={16} />
              </button>
            </form>
          </footer>
        </section>
      )}

      <button
        type="button"
        className="uk-button uk-button-primary bricor-chat-launcher"
        aria-label={isOpen ? 'Cerrar asistente virtual' : 'Abrir asistente virtual'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
