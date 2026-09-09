import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatBytes, formatCount } from '../lib/format';

interface ConfirmDialogProps {
  scopeLabel: string;
  itemCount: number;
  selectedSize: number;
  cautionCount: number;
  cleaning: boolean;
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmDialog({
  scopeLabel,
  itemCount,
  selectedSize,
  cautionCount,
  cleaning,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clean-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onCancel} disabled={cleaning}>
          <X size={17} />
        </button>
        <div className="confirm-icon"><Trash2 size={28} /></div>
        <span className="eyebrow">FINAL REVIEW</span>
        <h2 id="clean-dialog-title">清理{scopeLabel}的已选项目？</h2>
        <p>
          将移动 <strong>{formatCount(itemCount)} 个项目</strong>，预计释放{' '}
          <strong>{formatBytes(selectedSize)}</strong>。内容可以从废纸篓恢复。
        </p>
        {cautionCount > 0 && (
          <div className="modal-warning">
            <AlertTriangle size={17} />
            其中包含 {formatCount(cautionCount)} 个“谨慎”项目，请确认已经审阅。
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={cleaning}>
            返回检查
          </button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={cleaning}>
            {cleaning ? <span className="button-loader" /> : <Trash2 size={16} />}
            {cleaning ? '正在移动…' : '确认移入废纸篓'}
          </button>
        </div>
      </section>
    </div>
  );
}
