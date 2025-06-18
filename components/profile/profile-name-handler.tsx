'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileNameHandler() {
  const router = useRouter();

  useEffect(() => {
    const checkAndSavePendingName = async () => {
      const pendingName = localStorage.getItem('pendingUserName');
      
      if (pendingName) {
        try {
          const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: pendingName }),
          });

          if (response.ok) {
            localStorage.removeItem('pendingUserName');
            router.refresh();
          }
        } catch (error) {
          console.error('Error saving pending user name:', error);
        }
      }
    };

    checkAndSavePendingName();
  }, [router]);

  return null;
}