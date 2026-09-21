// TODO：通过包名 @learn/shared 导入 formatPrice，不复制实现或跨目录导入源码。
import { formatPrice } from "@learn/shared";

export default function App() {
  const amount = 99.9;
  // TODO：把占位文字改为调用共享函数的结果。
  const displayPrice = formatPrice(amount);

  return (
    <main className="app-shell" data-app="b">
      <section className="price-card">
        <p className="eyebrow">MONOREPO LAB / APP B</p>
        <h1>管理端报价</h1>
        <p className="description">
          不同的应用，同一份公共逻辑。将这个页面接到共享包中的格式化函数。
        </p>
        <div className="result">
          <span className="label">格式化结果</span>
          <output>{displayPrice}</output>
        </div>
        <p className="input">
          本应用的输入：<code>{amount}</code>
        </p>
        <p className="footer">
          <code>@learn/app-b</code> · 共享包接入练习
        </p>
      </section>
    </main>
  );
}
