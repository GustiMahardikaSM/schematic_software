import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';

/**
 * ImageUploader Component
 * Allows technicians to upload PCB or schematic photos for tracing.
 */
const ImageUploader = ({ onImageUpload }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onImageUpload(imageUrl);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    multiple: false
  });

  return (
    <div 
      {...getRootProps()} 
      className={`image-uploader ${isDragActive ? 'active' : ''}`}
      style={{
        border: '2px dashed #cbd5e1',
        borderRadius: '16px',
        padding: '1.5rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragActive ? '#f8fafc' : 'white',
        transition: 'all 0.3s ease',
        marginTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem'
      }}
    >
      <input {...getInputProps()} />
      <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '50%', color: '#64748b' }}>
        {isDragActive ? <Upload size={24} /> : <ImageIcon size={24} />}
      </div>
      <div style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>
        {isDragActive ? 'Drop image here...' : 'Upload PCB Photo / Schematic'}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '11px' }}>
        Drag & drop or click to select a file (JPG, PNG)
      </div>
    </div>
  );
};

export default ImageUploader;
