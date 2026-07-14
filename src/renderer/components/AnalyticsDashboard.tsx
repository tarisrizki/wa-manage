import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, MessageCircle, Users, Zap, TrendingUp, Send, CheckCheck, Reply } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsData {
  totalAccounts: number;
  totalRules: number;
  totalMessages: number;
  chartData: { name: string; fullDate: string; messages: number }[];
  broadcastStats?: {
    sent: number;
    delivered: number;
    read: number;
    replies: number;
  }
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = () => {
      // @ts-ignore
      if (window.api && window.api.getAnalytics) {
        // @ts-ignore
        window.api.getAnalytics().then(res => {
          setData(res);
          setIsLoading(false);
        }).catch((err: any) => {
          console.error(err);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    };

    // Simulasi delay sedikit untuk animasi saat pertama kali load
    const timer = setTimeout(fetchAnalytics, 600);

    // Listen untuk pesan baru agar data update otomatis (Real-time)
    let unsubscribeMsg = () => {};
    let unsubscribeStatus = () => {};
    // @ts-ignore
    if (window.api && window.api.onWhatsAppMessage) {
      // @ts-ignore
      unsubscribeMsg = window.api.onWhatsAppMessage(() => {
        // Tarik data ulang tanpa memunculkan loading spinner lagi (background refresh)
        fetchAnalytics();
      });
      // @ts-ignore
      if (window.api.onWhatsAppMessageStatusUpdate) {
        // @ts-ignore
        unsubscribeStatus = window.api.onWhatsAppMessageStatusUpdate(() => {
          fetchAnalytics();
        });
      }
    }

    return () => {
      clearTimeout(timer);
      unsubscribeMsg();
      unsubscribeStatus();
    };
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-foreground font-semibold mb-1">{label} <span className="text-muted-foreground text-xs font-normal">({payload[0].payload.fullDate})</span></p>
          <p className="text-wa-primary font-bold">
            {payload[0].value} <span className="text-muted-foreground font-medium text-sm">Pesan</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto bg-background p-6 lg:p-10 scrollbar-thin">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-wa-primary/10 rounded-xl border border-wa-primary/20">
            <BarChart3 className="text-wa-primary" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Tinjauan ringkas performa aplikasi WA Manager. Data riwayat pesan diambil langsung dari penyimpanan lokal (SQLite).
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-wa-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-current border-t-transparent shadow-[0_0_15px_rgba(0,168,132,0.3)] mb-4"></div>
            <p className="font-semibold animate-pulse">Menghitung Data...</p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl mx-auto space-y-6">
          
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-wa-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                  <MessageCircle className="text-emerald-500" size={24} />
                </div>
              </div>
              <h3 className="text-4xl font-bold text-foreground mb-1 tracking-tighter">{data?.totalMessages.toLocaleString('id-ID')}</h3>
              <p className="text-muted-foreground font-medium text-sm flex items-center gap-1.5">
                Total Pesan Tersimpan
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                  <Users className="text-blue-500" size={24} />
                </div>
              </div>
              <h3 className="text-4xl font-bold text-foreground mb-1 tracking-tighter">{data?.totalAccounts}</h3>
              <p className="text-muted-foreground font-medium text-sm flex items-center gap-1.5">
                Akun WhatsApp Tersimpan
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500/20 transition-colors">
                  <Zap className="text-amber-500" size={24} />
                </div>
              </div>
              <h3 className="text-4xl font-bold text-foreground mb-1 tracking-tighter">{data?.totalRules}</h3>
              <p className="text-muted-foreground font-medium text-sm flex items-center gap-1.5">
                Aturan Balas Otomatis Aktif
              </p>
            </motion.div>
          </div>

          {/* BROADCAST METRICS */}
          {data?.broadcastStats && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 p-6 rounded-3xl shadow-sm mt-6"
            >
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Send className="text-primary" size={20} />
                Performa Broadcast / Kampanye
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Sent */}
                <div className="flex flex-col p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <span className="text-muted-foreground font-semibold text-sm mb-1">Pesan Keluar (Sent)</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-foreground">{data.broadcastStats.sent.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivered */}
                <div className="flex flex-col p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <span className="text-muted-foreground font-semibold text-sm mb-1">Diterima (Delivered)</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-foreground">{data.broadcastStats.delivered.toLocaleString()}</span>
                    {data.broadcastStats.sent > 0 && (
                      <span className="text-sm font-medium text-emerald-500 mb-1">
                        {Math.round((data.broadcastStats.delivered / data.broadcastStats.sent) * 100)}% Rate
                      </span>
                    )}
                  </div>
                </div>

                {/* Read */}
                <div className="flex flex-col p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <span className="text-muted-foreground font-semibold text-sm mb-1 flex items-center gap-1">
                    <CheckCheck size={16} className="text-blue-500" /> Dibaca (Read)
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-foreground">{data.broadcastStats.read.toLocaleString()}</span>
                    {data.broadcastStats.delivered > 0 && (
                      <span className="text-sm font-medium text-blue-500 mb-1">
                        {Math.round((data.broadcastStats.read / data.broadcastStats.delivered) * 100)}% Rate
                      </span>
                    )}
                  </div>
                </div>

                {/* Replies */}
                <div className="flex flex-col p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <span className="text-muted-foreground font-semibold text-sm mb-1 flex items-center gap-1">
                    <Reply size={16} className="text-purple-500" /> Dibalas (Replied)
                  </span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-foreground">{data.broadcastStats.replies.toLocaleString()}</span>
                    {data.broadcastStats.sent > 0 && (
                      <span className="text-sm font-medium text-purple-500 mb-1">
                        {Math.round((data.broadcastStats.replies / data.broadcastStats.sent) * 100)}% Rate
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* CHART */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-card/50 backdrop-blur-xl border border-border/60 p-6 rounded-3xl shadow-sm mt-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="text-wa-primary" size={20} />
                  Aktivitas Pesan (7 Hari Terakhir)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Grafik volume pengiriman dan penerimaan pesan WhatsApp.</p>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              {data && data.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--wa-primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--wa-primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dx={-10}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '5 5' }} />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="hsl(var(--wa-primary))" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorMessages)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--wa-primary))" }}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 size={48} className="mb-4 opacity-20" />
                  <p>Belum ada data pesan dalam 7 hari terakhir.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
