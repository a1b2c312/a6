/* 星辰班级 · 登录校验（纯前端，静态站专用）
 * ------------------------------------------------------------------
 * 本文件不含任何明文姓名、学号、科目或密码，只保存「带盐 SHA-256 校验码」。
 * 账号 = 学生姓名 / 老师科目名；密码 = 完整学号 / 老师统一密码。
 * 注意：静态站没有服务端，前端校验只能挡「随手点开」，做不到真正鉴权；
 *       懂技术的人可以绕过本文件。请勿在此站点放置敏感资料。
 * ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var SALT = 'd0e8133f185f583a98bfd6854b80158ce1a4b93240be3046';
  var TOKENS = [
    '62cfa008618460d5b5a7cd84545410b8a0a4ea4590c068fa6d14150318e8c14c',
    '98b41f0a7957b7b3150cabf3e72b8b5101234a16c53d73c04cab5c229a5b7ba6',
    '378204eebd37116a5c0287fa5aaed6fc771da842407c84ef039f2fadcb7bebd1',
    '161076fba093af8f91edccea9ae0410a80d471216fa6ceb885e1d2fee65d51ad',
    '9eb58c0823996d9e8c67ff416eff27a03625a02573f249078c78e5b56e5e1447',
    '21e0e9887fb3b9ba9c072d7e35495b8a61a9aa6817a2c7b48e58ac0e7bb0e8d1',
    'd3471e41eec1cb3a25cba367d064f48c2e8fb7d664b85131661cb8df6471f4eb',
    '9cbc8e26f09398d389ac88d97b33e6be17f6624446a9c1ae2b3eda466a798191',
    '062f4d6454b651da4acbc7de12dfba6a9274205e694c92693394701bd281148d',
    '54bad3fd580d90dbc0f235d24021c04625a6b02d507bfd1851792ceea9e3b3eb',
    '72e5eeb0ea74b0baf881caa804826957ffd2e1a2d035fe2510362ed02d3f80d2',
    '875e48c95d9c8807d246b18314e4520380d1a6a8291d989c6f70a03a819bc344',
    'bcc79e4be41aa1e7a1fdc6297a1546ab16baaf788411b54dca8187c002e4619f',
    '61c9ed50a93a142c420e8f8a516303798acbf292039f548a7161a1d5b838c632',
    '4795df67690df16a9f2afc406ca06f4915da60f6ca75c2271f4bd939a23ad6cb',
    'c72abe4eb7e41a46081a81125e06f065c2816fff6b6238e6efb744ff5472b0a5',
    '0699dd815183df920595d68b8ee8a29a06288285162a5e760dd7a405c190d6e8',
    '1c1593cd52241dc258cfd2fbbf65202b96e9b993292e07cbf74d0deecedf9cde',
    '6fe02a75ea481ce7baf66e7ad53e80b79674d49f3ee2756a3960ea2afb3dfd94',
    'b03224e4919befd487a9db3030e6cc54c778725f784f67a2227d7ac744a63d8c',
    'ea01aae46906d5a02b34892a53c54f1ad9160846c758130f8e6af5038bcd56c3',
    'e2f595e3762e7a61a5b34ebf1ddae4d93a788e01036eaca5a31af705ee6ef8b0',
    '10769890dab82962b66e9a67669578b7480a7a37987f9ef585741cca3c8524b9',
    '956efc712b46deadedb4274ba670ff019f51c4deae5115019fdcca65de96b7b4',
    'dc69533417925371dc0188f22358df2cb31f16d4cca1abd80c9f78bdcd1d450d',
    'b98112846685b442301aa5c42dff6392ce1fa0c4c2b4694ec7c9a0e1e361233a',
    'a9370320ad57c4cb1299ff6256cde42e4ada64c141e7296300d84258ff457809',
    'db52829a4fd77ec4aa1efccd7aa91abef5714dcfe4b44650d753201a31fe787e',
    'f9ab4ea086df4a607f8d41104306208dd88d0a474145501f378a43fd41bd52db',
    'da46372605f4874c05055d4d76d682f58b9ffa94308797915e6fe185d6c506c6',
    '7577b640fda748f2aad054f836962f2045de58074ddf3dc365ee8db78de1123d',
    '8447cbc89f054280cdea2b468caa725ebd195e755b5bf269908b7c168b959f72',
    '07ac943d440c24335eeb8bf360789aa896bd6145f2453b5f44260bdfd25f6ee5',
    '3c40b0d7b4b93176a641f6f131545038a88412b52f2cab6b976bf84085fb7c00',
    'da6a9c42af298056e5bd1263b40bdfef1db596204681de8dba69331a74fb8a68',
    '894b9a025cb01804fcebf64e384a131651a2ed23cde890aaeedfc5d98543d1ef',
    '95e5a02e5a93dbe1295b9e22f466b6bb79af97aef2d3ca9aad56ac6f86963852',
    '12bff08eb582af8c3d66092119786d41985192461d947268908e5dd9c9c0cee4',
    '7c5d4ac4d1b6f4c4e1e28cca034bd8bb2bac426a08cd0b08574a3d3c31bcbbce',
    'e52e620c8e831a52272bd3c4f653aabd414ce6e481da5388b3ea7538544eda04',
    '89e8bf80a44ed62aeb8e319cfe64efe0a14b2cf83310aea4e4965e566a038bab',
    'a068bd550f44287b6049ca61c7304b32281ae449d981151c1330a0c0cb7cd3bb',
    '928b44ad22b7960c408afda3434d6ca6c2ffd770630b707fee9d2e2f4a5098a6',
    '2d6e96ad41fa2cc6201a792ae5cbf6b91eb49e37787d7e57aa3200f70bf318fd',
    'c51c5a970c86a3f43c583fadd93ee4441376a5ea808f610882e4559b014827bd',
    '8cfcbacfbb2abdfcb705e914e7f70a0fed3ae9ba0907a7e5cf7a45a067ab8e2d',
    'bc0d6acdd08a4ab69af82d6bdc8d728d7bc795dbe8792c841303c2de20876d66',
    'fb2d33fbf5217dd2abecff13091dd639e75e020ead24cb1314de4590ab248022',
    'aaa1db31ac120830584780618160ab412f1f98c821c6d36f65741b865e9d5bf4',
    'bf0deefdc50cdf89cfa61e4ee17b6da6612747bf89af09b3c5fbc00e97ed3dff',
    'fe2f4aaec7eb677d422bf605b5f1823b0c24569482fdede108707eeaeb697595',
    'b50197b3dd935d50b49b15fdd3346f8dd88903ad94b8d25292d6d998904f3fa7',
    '371fdecddae27f55eb1d2a2c363828e79b73e5c72c69ac52fd61be6252a2ec4f',
    '9cb136e8ca8a4514ec86ecf2d5635c7115248fdf42fa2e0ed47b9ba2324d91a7',
    '77050bf3985bf36d465c6085f6adcabecbe51485d0a61774aa771ec9db939c3f',
    'f432f469735a70cb8a38e7be71fca98f3f62f037ead448382314a22893ef0589',
    '9a1d3ce76826a768a1652499febae86dd7e836d854be28b9199ca1cd0ab606be',
    '168c9fcd90d492b858eaf75eadde166f3e9e197928b7577837163da6b5fb72bd',
    '7f82e5ef66a415e7781662857cabc0afa8c94cac6d3fbafc3a696f396a3e2fb8',
    '5fd7276389a6da2df92bfd3ff3fed5f163fc50ce24ae880a3a864c6353d799a4',
    'aa58727af829ae75fcd795614065fd5b5440bbfff3b15068901496b27af435fc',
    '4bb2d5ceba6711078629ed5b2e5e27f93b1d4fd10e87411a20df1715d8cf16ef',
    '865bd0e6880b609fc55cb42131af0f6959b6b1fe42d41e9bf0278da720359670',
    'de22bb29646bf4ee2be87265e9bbf36d36c00b401058c963a5ed4a5c1efd456b',
    'f344423f6ab9cdc8a352e1e1e6a900f4f06b63c6d95bffc6f289191d54ea4d76',
    '998762361b79b23747d6cf9404c16a9ec1e99dcdcfa0bc360306625f187bff8a',
    '286d4feb7a86762dd02a55160a3cb07b263d53f2613341e3df715b694f4ab600'
  ];

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

  /* 标准 SHA-256，输入按 UTF-8 编码，输出 64 位小写十六进制 */
  function sha256Hex(str) {
    var bytes = new TextEncoder().encode(String(str));
    var bitLen = bytes.length * 8;
    var padLen = Math.ceil((bytes.length + 9) / 64) * 64;
    var data = new Uint8Array(padLen);
    data.set(bytes);
    data[bytes.length] = 0x80;
    var hi = Math.floor(bitLen / 4294967296);
    var lo = bitLen >>> 0;
    data[padLen - 8] = (hi >>> 24) & 255;
    data[padLen - 7] = (hi >>> 16) & 255;
    data[padLen - 6] = (hi >>> 8) & 255;
    data[padLen - 5] = hi & 255;
    data[padLen - 4] = (lo >>> 24) & 255;
    data[padLen - 3] = (lo >>> 16) & 255;
    data[padLen - 2] = (lo >>> 8) & 255;
    data[padLen - 1] = lo & 255;

    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    for (var off = 0; off < padLen; off += 64) {
      var W = new Uint32Array(64);
      for (var i = 0; i < 16; i++) {
        var j = off + 4 * i;
        W[i] = ((data[j] << 24) | (data[j + 1] << 16) |
                (data[j + 2] << 8) | data[j + 3]) >>> 0;
      }
      for (i = 16; i < 64; i++) {
        var x = W[i - 15], y = W[i - 2];
        var s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
        var s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3],
          e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        var ch = ((e & f) ^ (~e & g)) >>> 0;
        var t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (v) {
      return ('00000000' + v.toString(16)).slice(-8);
    }).join('');
  }

  function token(account, password) {
    return sha256Hex(SALT + '|' + String(account).trim() + '|' + String(password).trim());
  }

  global.XCAuth = {
    verify: function (account, password) {
      return TOKENS.indexOf(token(account, password)) !== -1;
    },
    ok: function () {
      try { sessionStorage.setItem('xc_auth', '1'); } catch (e) {}
    },
    clear: function () {
      try { sessionStorage.removeItem('xc_auth'); } catch (e) {}
    },
    _sha256: sha256Hex
  };

  /* 登录页自身带 data-login-page，跳过拦截，避免死循环 */
  if (document.documentElement.hasAttribute('data-login-page')) return;
  try {
    if (sessionStorage.getItem('xc_auth') === '1') return;
  } catch (e) {}

  var back = location.href;
  location.replace('login.html?from=' + encodeURIComponent(back));
})(window);
