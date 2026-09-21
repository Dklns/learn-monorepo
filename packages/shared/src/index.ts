// 教学示例：演示共享函数，不作为生产级金额处理方案。
export function formatPrice(amount: number): string {
  return `￥${amount.toFixed(2)}`;
}

// 没有意义的函数
export function foo() {
  return "学习中";
}
