import { ImageResponse } from 'next/og'
 
// Image metadata
export const alt = 'Your Site Name'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'
 
// Image generation
export default function OGImage() {
  return new ImageResponse(
    (
      // Replace this with your OG image design
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom right, #000, #333)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div>Your Site Name</div>
          <div style={{ fontSize: 48, marginTop: 20 }}>Your Tagline</div>
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}