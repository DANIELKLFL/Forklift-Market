{item.imageUrls?.length > 0 && (
  <div style={{
    display: 'grid',
    gap: 12,
    marginTop: 20,
    maxWidth: 900
  }}>
    {item.imageUrls.map((url, index) => (
      <img
        key={url}
        src={url}
        alt={`${item.title} 이미지 ${index + 1}`}
        style={{
          width: '100%',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      />
    ))}
  </div>
)}
