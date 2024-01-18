export class Stream {
  constructor(public code: string, public position: number) { }

  peek(offset: number = 0) {
    return this.code[this.position + offset];
  }

  forward(offset: number = 1) {
    this.position = this.position + offset;
  }

  clone() {
    return new Stream(this.code, this.position);
  }
}
