import { ImageResponse } from 'next/og'
 
// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      // Replace this with your Apple Touch icon design
      <div
        style={{
          fontSize: 120,
          background: 'linear-gradient(to bottom right, #000, #333)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 20,
        }}
      >
        R
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}