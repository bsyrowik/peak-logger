export class Bitfield {
    public data: number = 0;
    constructor(_data?: undefined | number) {
        if (typeof _data === 'number') {
            this.data = _data;
        }
    }
    set(i: number, val: boolean = true): void {
        if (val) {
            this.data |= 1 << i;
        } else {
            this.data &= ~(1 << i);
        }
    }
    get(i: number): boolean {
        return Boolean((this.data >> i) & 0x1);
    }
}
