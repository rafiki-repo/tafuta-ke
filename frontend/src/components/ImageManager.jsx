/**
 * ImageManager — Business photo management panel (PRD-07 §6–§13).
 *
 * Props:
 *   businessId  {string}  – UUID of the business
 *   canDelete   {boolean} – whether the current user can delete photos
 *                           (owner/admin can; employee cannot per PRD-07 §13)
 */

import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit2, X, RotateCcw, Lock, ImageOff } from 'lucide-react';
import { businessAPI } from '@/lib/api';
import ImageTransformPreview from './ImageTransformPreview';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TRANSFORM = {
  zoom: 1.0,
  offset_x: 0,
  offset_y: 0,
  rotation: 0,
  flip_horizontal: false,
  flip_vertical: false,
  brightness: 0.0,
  contrast: 0.0,
  saturation: 0.0,
};

// ---------------------------------------------------------------------------
// TransformSliders — reusable slider panel for the 9 transform parameters
// ---------------------------------------------------------------------------

function SliderRow({ label, min, max, step, value, onChange }) {
  const decimals = step < 1 ? 2 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary"
      />
      <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
        {Number(value).toFixed(decimals)}
      </span>
    </div>
  );
}

function TransformSliders({ transform, onChange }) {
  const update = (key, value) => onChange({ ...transform, [key]: value });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">Transform</span>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_TRANSFORM })}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <SliderRow label="Zoom" min={1} max={5} step={0.1} value={transform.zoom} onChange={(v) => update('zoom', v)} />
      <SliderRow label="Offset X" min={-200} max={200} step={1} value={transform.offset_x} onChange={(v) => update('offset_x', v)} />
      <SliderRow label="Offset Y" min={-200} max={200} step={1} value={transform.offset_y} onChange={(v) => update('offset_y', v)} />
      <SliderRow label="Rotation" min={-180} max={180} step={1} value={transform.rotation} onChange={(v) => update('rotation', v)} />
      <SliderRow label="Brightness" min={-1} max={1} step={0.05} value={transform.brightness} onChange={(v) => update('brightness', v)} />
      <SliderRow label="Contrast" min={-1} max={1} step={0.05} value={transform.contrast} onChange={(v) => update('contrast', v)} />
      <SliderRow label="Saturation" min={-1} max={1} step={0.05} value={transform.saturation} onChange={(v) => update('saturation', v)} />

      <div className="flex gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={transform.flip_horizontal}
            onChange={(e) => update('flip_horizontal', e.target.checked)}
            className="h-4 w-4"
          />
          Flip H
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={transform.flip_vertical}
            onChange={(e) => update('flip_vertical', e.target.checked)}
            className="h-4 w-4"
          />
          Flip V
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal overlay wrapper
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageManager
// ---------------------------------------------------------------------------

export default function ImageManager({ businessId, canDelete = true }) {
  const [config, setConfig] = useState(null);
  const [images, setImages] = useState({});
  const [activeType, setActiveType] = useState('logo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadTransform, setUploadTransform] = useState({ ...DEFAULT_TRANSFORM });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editImage, setEditImage] = useState(null); // { slug, imageType, imageUrl, transform }
  const [editTransform, setEditTransform] = useState({ ...DEFAULT_TRANSFORM });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete state: slug being confirmed or deleted
  const [deleteConfirm, setDeleteConfirm] = useState(null); // slug
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = async () => {
    try {
      setError(null);
      const [configRes, photosRes] = await Promise.all([
        businessAPI.getPhotoConfig(),
        businessAPI.listPhotos(businessId),
      ]);
      setConfig(configRes.data.data);
      setImages(photosRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load photos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const typeList = config ? Object.keys(config.image_types) : [];
  const currentImages = images[activeType] || [];
  const typeConfig = config?.image_types?.[activeType];
  const atMax = typeConfig ? currentImages.length >= typeConfig.max_images : false;

  // Preview target size: use first configured size for the active type
  const previewTarget = (() => {
    if (!typeConfig) return { width: 400, height: 300 };
    const firstSize = Object.values(typeConfig.sizes)[0];
    return firstSize || { width: 400, height: 300 };
  })();

  // Smallest size URL for a given image (for thumbnails and edit preview)
  const thumbUrl = (image) => Object.values(image.sizes)[0];

  // ---------------------------------------------------------------------------
  // Upload handlers
  // ---------------------------------------------------------------------------

  const openUpload = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadTransform({ ...DEFAULT_TRANSFORM });
    setUploadError(null);
    setUploadOpen(true);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    // Auto-fill name from filename (strip extension)
    if (!uploadName) {
      setUploadName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim());
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) { setUploadError('Please select an image file.'); return; }
    if (!uploadName.trim()) { setUploadError('Please enter a name for this image.'); return; }

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('image_type', activeType);
      fd.append('image_name', uploadName.trim());
      fd.append('transform', JSON.stringify(uploadTransform));
      await businessAPI.uploadPhoto(businessId, fd);
      setUploadOpen(false);
      await loadData();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edit (transform update) handlers
  // ---------------------------------------------------------------------------

  const openEdit = (image) => {
    setEditImage({
      slug: image.slug,
      imageType: activeType,
      imageUrl: thumbUrl(image),
      name: image.name,
    });
    setEditTransform({ ...DEFAULT_TRANSFORM, ...(image.transform || {}) });
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editImage) return;
    setSaving(true);
    setEditError(null);
    try {
      await businessAPI.updatePhotoTransform(businessId, editImage.slug, {
        image_type: editImage.imageType,
        transform: editTransform,
      });
      setEditOpen(false);
      await loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete handlers
  // ---------------------------------------------------------------------------

  const handleDelete = async (slug) => {
    setDeleting(true);
    try {
      await businessAPI.deletePhoto(businessId, slug, activeType);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image.');
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Type tabs */}
      <div className="flex border-b overflow-x-auto">
        {typeList.map((type) => {
          const tc = config.image_types[type];
          const count = (images[type] || []).length;
          const full = count >= tc.max_images;
          return (
            <button
              key={type}
              type="button"
              onClick={() => { setActiveType(type); setDeleteConfirm(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeType === type
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tc.label || type.charAt(0).toUpperCase() + type.slice(1)}
              <Badge variant={full ? 'secondary' : 'outline'} className="text-xs">
                {full ? <Lock className="h-3 w-3 mr-1 inline" /> : null}
                {count}/{tc.max_images}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Upload button */}
      {!atMax && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={openUpload}>
            <Upload className="h-4 w-4 mr-2" />
            Upload {typeConfig?.label || activeType}
          </Button>
        </div>
      )}
      {atMax && (
        <p className="text-sm text-muted-foreground">
          Maximum number of {typeConfig?.label?.toLowerCase() || activeType} images reached. Delete one to upload another.
        </p>
      )}

      {/* Image grid */}
      {currentImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3 border border-dashed rounded-lg">
          <ImageOff className="h-10 w-10" />
          <p className="text-sm">No {typeConfig?.label?.toLowerCase() || activeType} images yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {currentImages.map((image) => (
            <div key={image.slug} className="border rounded-lg overflow-hidden bg-muted/30">
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={thumbUrl(image)}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <p className="text-sm font-medium truncate mb-2">{image.name}</p>

                {deleteConfirm === image.slug ? (
                  <div className="space-y-1">
                    <p className="text-xs text-destructive">Delete this image?</p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleDelete(image.slug)}
                        disabled={deleting}
                      >
                        {deleting ? <Spinner size="sm" /> : 'Yes, delete'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => openEdit(image)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setDeleteConfirm(image.slug)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <Modal
          title={`Upload ${typeConfig?.label || activeType}`}
          onClose={() => !uploading && setUploadOpen(false)}
        >
          <div className="space-y-4">
            {uploadError && (
              <Alert variant="destructive">
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Image File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted: JPG, PNG, GIF, WebP · Max {config?.max_upload_size_mb || 10} MB
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image Name</label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Front of shop"
                maxLength={80}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Preview</p>
                <ImageTransformPreview
                  file={uploadFile}
                  transform={uploadTransform}
                  targetWidth={previewTarget.width}
                  targetHeight={previewTarget.height}
                />
              </div>
              <TransformSliders
                transform={uploadTransform}
                onChange={setUploadTransform}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" onClick={handleUpload} disabled={uploading || !uploadFile}>
                {uploading ? (
                  <><Spinner size="sm" className="mr-2" /> Uploading…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Upload</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editOpen && editImage && (
        <Modal
          title={`Edit Transform — ${editImage.name}`}
          onClose={() => !saving && setEditOpen(false)}
        >
          <div className="space-y-4">
            {editError && (
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Preview</p>
                <ImageTransformPreview
                  imageUrl={editImage.imageUrl}
                  transform={editTransform}
                  targetWidth={previewTarget.width}
                  targetHeight={previewTarget.height}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preview uses the thumbnail. The full-resolution output will be regenerated on save.
                </p>
              </div>
              <TransformSliders
                transform={editTransform}
                onChange={setEditTransform}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" onClick={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <><Spinner size="sm" className="mr-2" /> Saving…</>
                ) : (
                  'Save Transform'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
