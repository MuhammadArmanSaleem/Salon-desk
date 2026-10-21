import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'SalonDesk — Your day, beautifully managed',description:'Salon appointment, client and payment management demo.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
