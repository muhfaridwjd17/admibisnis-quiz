const QUIZ_DATA = {
  subjects: [
    {
      id: "pkn",
      title: "Pendidikan Kewarganegaraan",
      icon: "🏛️",
      color: "#EF4444",
      gradient: "from-red-500 to-rose-700",
      description: "Uji pengetahuan tentang kewarganegaraan dan nilai-nilai kebangsaan",
      questions: [
        { q: "Pancasila sebagai dasar negara Indonesia tercantum dalam...", options: ["UUD 1945 Pasal 1", "Pembukaan UUD 1945", "UUD 1945 Pasal 36", "Tap MPR No. I/1988"], answer: 1 },
        { q: "Hak warga negara untuk mendapatkan pendidikan diatur dalam UUD 1945 pasal...", options: ["Pasal 27", "Pasal 28", "Pasal 31", "Pasal 34"], answer: 2 },
        { q: "Bhineka Tunggal Ika berasal dari bahasa...", options: ["Sanskrit", "Jawa Kuno", "Melayu Kuno", "Kawi"], answer: 3 },
        { q: "Lembaga yang berwenang mengubah UUD 1945 adalah...", options: ["DPR", "MPR", "MK", "MA"], answer: 1 },
        { q: "Semboyan 'Bhineka Tunggal Ika' termuat dalam kitab...", options: ["Negarakertagama", "Sutasoma", "Pararaton", "Serat Centhini"], answer: 1 },
        { q: "Asas pemilu di Indonesia yang berarti setiap warga negara punya satu suara adalah...", options: ["Langsung", "Umum", "Bebas", "Jujur"], answer: 0 },
        { q: "Kewajiban bela negara diatur dalam UUD 1945 pasal...", options: ["Pasal 27 ayat (3)", "Pasal 28", "Pasal 30 ayat (1)", "Pasal 33"], answer: 2 },
        { q: "Ideologi Pancasila berbeda dengan liberalisme karena Pancasila lebih mengutamakan...", options: ["Kebebasan individu", "Keseimbangan hak dan kewajiban", "Kepentingan golongan", "Hak asasi manusia"], answer: 1 },
        { q: "Sistem pemerintahan Indonesia adalah...", options: ["Presidensial", "Parlementer", "Semi-presidensial", "Monarki konstitusional"], answer: 0 },
        { q: "Warga negara Indonesia yang berada di luar negeri tetap wajib mematuhi hukum Indonesia berdasarkan asas...", options: ["Teritorialitas", "Personalitas aktif", "Personalitas pasif", "Universalitas"], answer: 1 }
      ]
    },
    {
      id: "mpi",
      title: "Manajemen Portofolio & Investasi",
      icon: "📈",
      color: "#10B981",
      gradient: "from-emerald-500 to-teal-700",
      description: "Uji pemahaman tentang portofolio investasi dan pengelolaan aset",
      questions: [
        { q: "Teori portofolio modern dikembangkan pertama kali oleh...", options: ["William Sharpe", "Harry Markowitz", "Eugene Fama", "Robert Merton"], answer: 1 },
        { q: "Risiko yang tidak dapat dihilangkan melalui diversifikasi disebut...", options: ["Risiko tidak sistematis", "Risiko sistematis", "Risiko likuiditas", "Risiko kredit"], answer: 1 },
        { q: "Capital Asset Pricing Model (CAPM) digunakan untuk...", options: ["Menghitung dividen", "Menentukan expected return aset berisiko", "Menganalisis laporan keuangan", "Menghitung bunga obligasi"], answer: 1 },
        { q: "Beta yang lebih besar dari 1 menunjukkan bahwa saham tersebut...", options: ["Lebih stabil dari pasar", "Lebih fluktuatif dari pasar", "Sama dengan pasar", "Tidak berkorelasi dengan pasar"], answer: 1 },
        { q: "Efficient Market Hypothesis (EMH) dalam bentuk kuat menyatakan bahwa...", options: ["Harga saham mencerminkan informasi historis", "Harga saham mencerminkan informasi publik", "Harga saham mencerminkan semua informasi", "Harga saham tidak mencerminkan informasi apapun"], answer: 2 },
        { q: "Diversifikasi portofolio bertujuan untuk...", options: ["Memaksimalkan return", "Meminimalkan risiko tidak sistematis", "Meminimalkan risiko sistematis", "Memaksimalkan beta"], answer: 1 },
        { q: "Obligasi dengan kupon 0% disebut...", options: ["Convertible bond", "Zero-coupon bond", "Callable bond", "Junk bond"], answer: 1 },
        { q: "Sharpe Ratio digunakan untuk mengukur...", options: ["Risiko portofolio", "Return per unit risiko", "Korelasi antar aset", "Volatilitas pasar"], answer: 1 },
        { q: "Jika return pasar 10%, risk-free rate 4%, dan beta saham 1,5 maka expected return saham adalah...", options: ["13%", "15%", "19%", "10%"], answer: 0 },
        { q: "Teknik analisis saham yang menggunakan data historis harga dan volume disebut...", options: ["Analisis fundamental", "Analisis teknikal", "Analisis makro", "Analisis kuantitatif"], answer: 1 }
      ]
    },
    {
      id: "pk",
      title: "Perilaku Konsumen",
      icon: "🛍️",
      color: "#8B5CF6",
      gradient: "from-violet-500 to-purple-700",
      description: "Uji pengetahuan tentang perilaku dan psikologi konsumen",
      questions: [
        { q: "Teori hierarki kebutuhan Maslow menempatkan kebutuhan apa pada tingkat paling dasar?", options: ["Kebutuhan keamanan", "Kebutuhan fisiologis", "Kebutuhan sosial", "Kebutuhan aktualisasi diri"], answer: 1 },
        { q: "Proses pengambilan keputusan konsumen yang paling lengkap dimulai dari...", options: ["Pencarian informasi", "Pengenalan masalah", "Evaluasi alternatif", "Keputusan pembelian"], answer: 1 },
        { q: "Disonansi kognitif dalam perilaku konsumen terjadi...", options: ["Sebelum pembelian", "Saat pembelian", "Setelah pembelian", "Saat pencarian informasi"], answer: 2 },
        { q: "Kelompok referensi yang paling berpengaruh terhadap konsumen adalah...", options: ["Kelompok primer", "Kelompok sekunder", "Kelompok aspirasi", "Kelompok dissosiasi"], answer: 0 },
        { q: "Persepsi konsumen dipengaruhi oleh tiga proses, KECUALI...", options: ["Selective exposure", "Selective distortion", "Selective retention", "Selective decision"], answer: 3 },
        { q: "Brand loyalty pada konsumen merupakan contoh dari...", options: ["Pembelajaran kognitif", "Pembelajaran operant", "Loyalitas situasional", "Impulse buying"], answer: 1 },
        { q: "Ketika konsumen membeli produk tanpa perencanaan sebelumnya, disebut...", options: ["Planned purchase", "Impulse buying", "Habitual buying", "Complex buying"], answer: 1 },
        { q: "Segmentasi berdasarkan gaya hidup konsumen disebut segmentasi...", options: ["Demografis", "Geografis", "Psikografis", "Behavioral"], answer: 2 },
        { q: "Teori perilaku konsumen yang menekankan pada stimulus-respon dikemukakan oleh...", options: ["Abraham Maslow", "Ivan Pavlov", "Sigmund Freud", "Philip Kotler"], answer: 1 },
        { q: "Consumer involvement yang tinggi biasanya terjadi pada pembelian produk...", options: ["Murah dan sering dibeli", "Mahal dan jarang dibeli", "Sehari-hari", "Impulsif"], answer: 1 }
      ]
    },
    {
      id: "kep",
      title: "Kepemimpinan",
      icon: "👑",
      color: "#F59E0B",
      gradient: "from-amber-500 to-orange-600",
      description: "Uji pemahaman tentang teori dan gaya kepemimpinan",
      questions: [
        { q: "Gaya kepemimpinan yang memberikan kebebasan penuh kepada bawahan disebut...", options: ["Otoriter", "Demokratis", "Laissez-faire", "Transformasional"], answer: 2 },
        { q: "Teori kepemimpinan situasional dikembangkan oleh...", options: ["Douglas McGregor", "Hersey dan Blanchard", "James MacGregor Burns", "Fred Fiedler"], answer: 1 },
        { q: "Pemimpin yang mampu mengubah nilai dan motivasi pengikutnya disebut pemimpin...", options: ["Transaksional", "Transformasional", "Karismatik", "Otoriter"], answer: 1 },
        { q: "Teori X dan Teori Y tentang asumsi pemimpin terhadap bawahan dikemukakan oleh...", options: ["Abraham Maslow", "Frederick Herzberg", "Douglas McGregor", "Victor Vroom"], answer: 2 },
        { q: "Dalam kepemimpinan situasional, tingkat kematangan bawahan yang rendah memerlukan gaya kepemimpinan...", options: ["Delegasi", "Partisipatif", "Telling/Directing", "Selling/Coaching"], answer: 2 },
        { q: "Emotional intelligence dalam kepemimpinan dipopulerkan oleh...", options: ["Peter Drucker", "Daniel Goleman", "Warren Bennis", "John Kotter"], answer: 1 },
        { q: "Servant leadership menekankan pada...", options: ["Kepentingan pemimpin", "Pelayanan kepada pengikut dan komunitas", "Kontrol dan kekuasaan", "Pencapaian target"], answer: 1 },
        { q: "Kekuasaan yang bersumber dari posisi formal dalam organisasi disebut...", options: ["Referent power", "Expert power", "Legitimate power", "Coercive power"], answer: 2 },
        { q: "Pemimpin yang memimpin melalui teladan dan pengaruh moral disebut pemimpin...", options: ["Otoriter", "Otentik", "Transaksional", "Birokratis"], answer: 1 },
        { q: "Faktor yang membedakan manajer dari pemimpin menurut John Kotter adalah...", options: ["Manajer menciptakan visi, pemimpin mengelola proses", "Pemimpin menciptakan perubahan, manajer mengelola kompleksitas", "Pemimpin bersifat otoriter, manajer demokratis", "Tidak ada perbedaan"], answer: 1 }
      ]
    },
    {
      id: "pp",
      title: "Pelayanan Prima",
      icon: "⭐",
      color: "#06B6D4",
      gradient: "from-cyan-500 to-blue-600",
      description: "Uji pengetahuan tentang layanan prima dan kepuasan pelanggan",
      questions: [
        { q: "Konsep pelayanan prima (excellence service) bertujuan untuk...", options: ["Meningkatkan laba perusahaan saja", "Memenuhi dan melampaui harapan pelanggan", "Mengurangi biaya operasional", "Memperbanyak produk"], answer: 1 },
        { q: "Dalam model SERVQUAL, reliability berarti...", options: ["Kemampuan fisik yang terlihat", "Kemampuan memberikan layanan yang dijanjikan dengan tepat", "Kesediaan membantu pelanggan", "Pengetahuan dan kesopanan karyawan"], answer: 1 },
        { q: "Customer satisfaction index (CSI) digunakan untuk mengukur...", options: ["Laba perusahaan", "Tingkat kepuasan pelanggan", "Volume penjualan", "Jumlah karyawan"], answer: 1 },
        { q: "Standar pelayanan prima mengacu pada konsep 'A3', yaitu...", options: ["Attitude, Attention, Action", "Ability, Appearance, Attention", "Action, Ability, Attitude", "Appearance, Action, Attention"], answer: 0 },
        { q: "Net Promoter Score (NPS) mengukur...", options: ["Pendapatan bersih", "Kecenderungan pelanggan merekomendasikan produk/jasa", "Produktivitas karyawan", "Biaya layanan pelanggan"], answer: 1 },
        { q: "Keluhan pelanggan sebaiknya ditangani dengan pendekatan...", options: ["Diabaikan jika tidak relevan", "LAST (Listen, Apologize, Solve, Thank)", "Dilimpahkan ke departemen lain", "Dibalas secara formal saja"], answer: 1 },
        { q: "Empathy dalam pelayanan prima berarti...", options: ["Kecepatan layanan", "Kemampuan memahami perasaan pelanggan", "Tampilan fisik yang baik", "Kehandalan sistem"], answer: 1 },
        { q: "Service recovery adalah...", options: ["Pemulihan sistem IT", "Upaya memperbaiki layanan yang gagal", "Pelatihan ulang karyawan", "Perubahan standar pelayanan"], answer: 1 },
        { q: "Customer lifetime value (CLV) merupakan ukuran...", options: ["Usia rata-rata pelanggan", "Total nilai pendapatan dari satu pelanggan sepanjang waktu", "Jumlah produk yang dibeli", "Frekuensi kunjungan pelanggan"], answer: 1 },
        { q: "Prinsip 'underpromise and overdeliver' dalam pelayanan prima berarti...", options: ["Berjanji berlebihan untuk menarik pelanggan", "Menjanjikan lebih sedikit lalu memberikan lebih dari yang dijanjikan", "Tidak membuat janji kepada pelanggan", "Selalu menepati janji dengan tepat"], answer: 1 }
      ]
    },
    {
      id: "ebc",
      title: "English for Business Correspondent",
      icon: "✉️",
      color: "#3B82F6",
      gradient: "from-blue-500 to-indigo-700",
      description: "Test your knowledge of business correspondence in English",
      questions: [
        { q: "Which salutation is appropriate when you don't know the recipient's name?", options: ["Dear Sir/Madam", "Hey there", "To Whom It May Concern", "Both A and C"], answer: 3 },
        { q: "The complimentary close 'Yours faithfully' is used when...", options: ["You know the recipient's name", "You don't know the recipient's name", "Writing to a friend", "Writing informally"], answer: 1 },
        { q: "Which part of a business letter contains the reason for writing?", options: ["Salutation", "Body - opening paragraph", "Complimentary close", "Subject line"], answer: 1 },
        { q: "The abbreviation 'cc' in email stands for...", options: ["Carbon Copy", "Courtesy Copy", "Computer Copy", "Both A and B"], answer: 3 },
        { q: "'We refer to your letter dated...' is an example of a...", options: ["Closing sentence", "Opening sentence for reply letters", "Subject line", "Postscript"], answer: 1 },
        { q: "Which is the most formal way to begin a business email?", options: ["Hi John,", "Hello there,", "Dear Mr. Johnson,", "Hey!"], answer: 2 },
        { q: "A memorandum (memo) is used for communication...", options: ["Between companies", "Within the same organization", "With international clients", "With government agencies"], answer: 1 },
        { q: "The subject line in a business letter/email should be...", options: ["Long and detailed", "Brief and informative", "Written in lowercase", "Optional"], answer: 1 },
        { q: "Which phrase is used to make a polite request in business writing?", options: ["You must send...", "Send immediately...", "I would appreciate it if you could...", "Give me..."], answer: 2 },
        { q: "An enclosure notation in a business letter indicates...", options: ["The number of pages", "Additional documents included with the letter", "The writer's signature", "The date of the letter"], answer: 1 }
      ]
    },
    {
      id: "sb",
      title: "Simulasi Bisnis",
      icon: "🎯",
      color: "#EC4899",
      gradient: "from-pink-500 to-rose-600",
      description: "Uji pemahaman tentang simulasi dan strategi bisnis",
      questions: [
        { q: "Simulasi bisnis bertujuan untuk...", options: ["Membuat keputusan nyata secara langsung", "Melatih pengambilan keputusan dalam lingkungan yang aman", "Menggantikan praktik bisnis nyata", "Mengurangi biaya pelatihan saja"], answer: 1 },
        { q: "Analisis SWOT terdiri dari...", options: ["Strategy, Work, Output, Tactics", "Strengths, Weaknesses, Opportunities, Threats", "Sales, Workforce, Operations, Technology", "Success, Warning, Objectives, Targets"], answer: 1 },
        { q: "Break-even point adalah kondisi dimana...", options: ["Perusahaan mendapat laba maksimum", "Total pendapatan sama dengan total biaya", "Perusahaan mengalami kerugian", "Modal awal telah kembali"], answer: 1 },
        { q: "Dalam simulasi bisnis, market share menunjukkan...", options: ["Total penjualan perusahaan", "Persentase pangsa pasar perusahaan dari total industri", "Keuntungan bersih perusahaan", "Jumlah produk yang terjual"], answer: 1 },
        { q: "Strategi diferensiasi dalam simulasi bisnis berarti...", options: ["Bersaing dengan harga terendah", "Menawarkan produk/jasa yang unik dan berbeda", "Fokus pada satu segmen pasar", "Memperluas jangkauan pasar"], answer: 1 },
        { q: "Cash flow positif dalam simulasi bisnis menunjukkan...", options: ["Perusahaan pasti untung", "Arus kas masuk lebih besar dari arus kas keluar", "Aset perusahaan meningkat", "Hutang perusahaan berkurang"], answer: 1 },
        { q: "Strategi penetrasi pasar (market penetration) berarti...", options: ["Memasuki pasar baru", "Meningkatkan penjualan produk yang ada di pasar yang ada", "Mengembangkan produk baru", "Diversifikasi usaha"], answer: 1 },
        { q: "Key Performance Indicator (KPI) dalam bisnis digunakan untuk...", options: ["Mengukur kinerja berdasarkan target yang ditetapkan", "Menghitung gaji karyawan", "Menganalisis pesaing", "Membuat laporan pajak"], answer: 0 },
        { q: "Return on Investment (ROI) dihitung dengan rumus...", options: ["(Net Profit / Total Assets) x 100%", "(Net Profit / Total Investment) x 100%", "(Revenue - Cost) / Cost x 100%", "Both B and C"], answer: 3 },
        { q: "Dalam simulasi bisnis, keputusan pricing perlu mempertimbangkan...", options: ["Harga pokok produksi saja", "Harga pesaing saja", "Harga pokok, pesaing, dan nilai bagi pelanggan", "Tren pasar saja"], answer: 2 }
      ]
    },
    {
      id: "akb",
      title: "Aplikasi Komputer Bisnis",
      icon: "💻",
      color: "#14B8A6",
      gradient: "from-teal-500 to-cyan-700",
      description: "Uji pengetahuan tentang aplikasi komputer dalam bisnis",
      questions: [
        { q: "Fungsi VLOOKUP pada Microsoft Excel digunakan untuk...", options: ["Menjumlahkan data", "Mencari nilai berdasarkan referensi kolom", "Membuat grafik", "Mengurutkan data"], answer: 1 },
        { q: "Dalam Microsoft Excel, rumus untuk menghitung rata-rata adalah...", options: ["=SUM()", "=COUNT()", "=AVERAGE()", "=MEDIAN()"], answer: 2 },
        { q: "Pivot Table dalam Excel digunakan untuk...", options: ["Membuat presentasi", "Meringkas dan menganalisis data dalam jumlah besar", "Mengirim email", "Membuat database"], answer: 1 },
        { q: "Ekstensi file Microsoft Excel adalah...", options: [".doc", ".xlsx", ".pptx", ".pdf"], answer: 1 },
        { q: "Conditional Formatting di Excel digunakan untuk...", options: ["Mengubah format tanggal", "Memformat sel berdasarkan kondisi tertentu", "Membuat kondisi IF", "Mengunci sel"], answer: 1 },
        { q: "Fungsi IF pada Excel dengan syntax =IF(A1>50,'Lulus','Tidak Lulus') berarti...", options: ["Jika A1 lebih dari 50, tampilkan 'Lulus', jika tidak tampilkan 'Tidak Lulus'", "Jika A1 kurang dari 50, tampilkan 'Lulus'", "Selalu tampilkan 'Lulus'", "Jika A1 sama dengan 50, tampilkan 'Lulus'"], answer: 0 },
        { q: "Dalam Microsoft Word, mail merge digunakan untuk...", options: ["Mengirim email massal", "Membuat surat dengan data yang berbeda-beda secara otomatis", "Menggabungkan dua dokumen", "Membuat template surat"], answer: 1 },
        { q: "Database management system (DBMS) yang sering digunakan dalam bisnis adalah...", options: ["Microsoft Word", "Microsoft Access", "Microsoft PowerPoint", "Adobe Acrobat"], answer: 1 },
        { q: "Shortcut keyboard Ctrl+Z pada Microsoft Office berfungsi untuk...", options: ["Menyimpan dokumen", "Menyalin teks", "Membatalkan aksi terakhir", "Menutup aplikasi"], answer: 2 },
        { q: "Cloud computing dalam bisnis memberikan manfaat berupa...", options: ["Membutuhkan infrastruktur IT yang besar", "Akses data dari mana saja dan kapan saja", "Meningkatkan biaya IT", "Mengurangi keamanan data"], answer: 1 }
      ]
    },
    {
      id: "kb",
      title: "Kebijakan Bisnis",
      icon: "📋",
      color: "#F97316",
      gradient: "from-orange-500 to-red-600",
      description: "Uji pemahaman tentang kebijakan dan strategi bisnis perusahaan",
      questions: [
        { q: "Analisis Five Forces Porter meliputi ancaman dari...", options: ["Pesaing, pemasok, pembeli, pendatang baru, produk substitusi", "SWOT, PEST, Porter, BCG, Ansoff", "Harga, produk, promosi, distribusi, orang", "Pasar, modal, SDM, teknologi, regulasi"], answer: 0 },
        { q: "Corporate Social Responsibility (CSR) merupakan...", options: ["Kewajiban hukum perusahaan saja", "Tanggung jawab perusahaan terhadap masyarakat dan lingkungan", "Program pemasaran perusahaan", "Kebijakan deviden perusahaan"], answer: 1 },
        { q: "Matriks BCG mengklasifikasikan unit bisnis berdasarkan...", options: ["Profitabilitas dan efisiensi", "Pertumbuhan pasar dan pangsa pasar relatif", "Ukuran dan usia perusahaan", "Modal dan SDM"], answer: 1 },
        { q: "Merger adalah...", options: ["Pembelian perusahaan oleh perusahaan lain", "Penggabungan dua perusahaan menjadi satu entitas baru", "Pembagian perusahaan menjadi beberapa unit", "Penjualan aset perusahaan"], answer: 1 },
        { q: "Strategi diversifikasi konglomerat berarti perusahaan...", options: ["Masuk ke bisnis yang terkait dengan bisnis utama", "Masuk ke bisnis yang tidak terkait dengan bisnis utama", "Memperluas pasar geografis", "Mengembangkan produk baru untuk pasar yang sama"], answer: 1 },
        { q: "Governance perusahaan yang baik (Good Corporate Governance) meliputi prinsip...", options: ["Transparansi, akuntabilitas, responsibilitas, independensi, keadilan", "Profitabilitas, likuiditas, solvabilitas, aktivitas, pasar", "Perencanaan, pengorganisasian, pengarahan, pengendalian", "Input, proses, output, outcome, impact"], answer: 0 },
        { q: "Stakeholder dalam konteks kebijakan bisnis mencakup...", options: ["Pemegang saham saja", "Semua pihak yang mempengaruhi atau dipengaruhi oleh perusahaan", "Manajemen perusahaan saja", "Karyawan dan pemegang saham saja"], answer: 1 },
        { q: "Strategi blue ocean adalah strategi yang...", options: ["Bersaing keras di pasar yang sudah ada", "Menciptakan ruang pasar baru yang tidak ada pesaingnya", "Menurunkan harga untuk mengalahkan pesaing", "Mengikuti strategi pemimpin pasar"], answer: 1 },
        { q: "Balanced Scorecard mengukur kinerja perusahaan dari perspektif...", options: ["Keuangan, pelanggan, proses internal, pembelajaran dan pertumbuhan", "Laba, penjualan, biaya, aset", "SDM, teknologi, modal, pasar", "Produksi, distribusi, pemasaran, keuangan"], answer: 0 },
        { q: "Keunggulan kompetitif berkelanjutan (sustainable competitive advantage) dapat diperoleh melalui...", options: ["Harga murah saja", "Sumber daya yang langka, berharga, tidak dapat ditiru, dan terorganisasi (VRIO)", "Iklan yang gencar", "Ekspansi pasar cepat"], answer: 1 }
      ]
    },
    {
      id: "sim",
      title: "Sistem Informasi Manajemen",
      icon: "🖥️",
      color: "#6366F1",
      gradient: "from-indigo-500 to-violet-700",
      description: "Uji pengetahuan tentang sistem informasi dalam manajemen",
      questions: [
        { q: "Sistem Informasi Manajemen (SIM) bertujuan untuk...", options: ["Menggantikan peran manajer", "Menyediakan informasi yang mendukung pengambilan keputusan manajerial", "Membuat laporan keuangan saja", "Mengelola basis data saja"], answer: 1 },
        { q: "ERP (Enterprise Resource Planning) adalah...", options: ["Sistem perencanaan kebutuhan bahan baku", "Sistem informasi terintegrasi yang mengelola seluruh proses bisnis", "Software akuntansi", "Database management system"], answer: 1 },
        { q: "Data warehouse berbeda dari database operasional karena...", options: ["Data warehouse lebih kecil", "Data warehouse dioptimalkan untuk analisis dan pelaporan historis", "Data warehouse lebih cepat untuk transaksi", "Data warehouse tidak memerlukan backup"], answer: 1 },
        { q: "Sistem pendukung keputusan (DSS) digunakan oleh...", options: ["Karyawan level bawah", "Manajer menengah dan atas untuk pengambilan keputusan semi-terstruktur", "Hanya CEO perusahaan", "Departemen IT saja"], answer: 1 },
        { q: "CRM (Customer Relationship Management) system berfungsi untuk...", options: ["Mengelola aset perusahaan", "Mengelola hubungan dan interaksi dengan pelanggan", "Mengelola rantai pasokan", "Mengelola sumber daya manusia"], answer: 1 },
        { q: "Big Data dicirikan oleh 3V, yaitu...", options: ["Value, Velocity, Visibility", "Volume, Velocity, Variety", "Volume, Value, Verification", "Velocity, Validity, Volume"], answer: 1 },
        { q: "Keamanan informasi dalam SIM mencakup aspek CIA, yaitu...", options: ["Confidentiality, Integrity, Availability", "Control, Implementation, Assessment", "Computing, Internet, Analytics", "Configuration, Integration, Architecture"], answer: 0 },
        { q: "Sistem informasi eksekutif (EIS/ESS) digunakan untuk...", options: ["Pemrosesan transaksi harian", "Menyajikan informasi ringkasan untuk eksekutif senior", "Komunikasi antar karyawan", "Manajemen proyek IT"], answer: 1 },
        { q: "Interoperabilitas dalam sistem informasi berarti...", options: ["Sistem dapat bekerja sendiri tanpa internet", "Kemampuan berbagai sistem untuk saling berkomunikasi dan berbagi data", "Sistem dapat diakses 24 jam", "Sistem memiliki antarmuka yang ramah pengguna"], answer: 1 },
        { q: "Business Intelligence (BI) tools digunakan untuk...", options: ["Pembuatan kode program", "Mengubah data mentah menjadi wawasan bisnis yang berguna", "Pengelolaan email perusahaan", "Keamanan jaringan komputer"], answer: 1 }
      ]
    }
  ]
};
