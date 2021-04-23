import React from "react";
import { createMuiTheme, Theme, ThemeProvider } from '@material-ui/core/styles';
import "./App.scss"
import { DatePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import DateFnsUtils from '@date-io/date-fns';
import { TextField } from "@material-ui/core";
import bitwise from 'bitwise';
import { Bits } from "bitwise/types";

interface AppState {
    selectedDate: Date;
    selectedNumber: string;
    selectedNumberError: string;
    code: string;
    theme: Theme;
}

export default class App extends React.Component<{},  AppState> {
    private table: number[] = [];

    constructor(props: {}) {
        super(props);
        this.state = {
            selectedDate: new Date(),
            selectedNumber: "",
            selectedNumberError: "",
            code: "",
            theme: createMuiTheme({
                palette: {
                  primary: { main: "#1FB446" },
                  type: "dark",
                  background: { default: "#2E2D30" },
                  text: { primary: "#EBEBEB" }
                },
                props: { MuiButtonBase: { disableRipple: true } }
            })
        };

        // Creating base CRC Table for later lookup during code processing
        for(let i: number = 0; i < 256; i++) {
            let hash: number = i;
            for(let j: number = 0; j < 8; j++) {
                if(hash % 2) {
                    hash = this.xor(this.rightBitShift(hash, 1), 3988292384);
                } else {
                    hash = this.rightBitShift(hash, 1);
                }
            }
            this.table.push(hash);
        }
    }

    render() {
        return(
            <div id="App">
                <ThemeProvider theme={this.state.theme}>
                    <h2 id="headline">Nintendo Wii / DSI - Parental Control Reset</h2>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        <DatePicker
                            margin="normal"
                            format="dd.MM.yyyy"
                            label="Current Date of your Device"
                            value={this.state.selectedDate}
                            onChange={(date) => this.onDateChange(date)}
                            allowKeyboardControl={false}
                            style={{margin: "40px 0"}}
                        />
                    </MuiPickersUtilsProvider>
                    <br/>
                    <TextField
                        error={this.state.selectedNumberError !== ""}
                        label="Confirmation Number"
                        value={this.state.selectedNumber}
                        helperText={this.state.selectedNumberError}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.onNumberChange(event)}
                    />
                    <br/>
                    <br/>
                    {this.state.code &&
                        <>
                            <h3>Reset Code:</h3>
                            <h3>{this.state.code}</h3>
                        </>
                    }
                </ThemeProvider>
                <div id="credits">
                    Based on <a href="mailto:hector@marcansoft.com">Hector Martin Cantero's</a> Python Code from <a href="https://wii.marcan.st/parental" rel="noreferrer" target="_blank">https://wii.marcan.st/parental</a>
                    <br/>
                    Translation from Python to Javascript/Typescript by <a href="mailto:info@dereffi.com">DerEffi</a>
                    <br/>
                    <a href="https://github.com/DerEffi/nintendo-parent-control-reset" target="_blank" rel="noreferrer">Look at the Source-Code</a>
                </div>
            </div>
        );
    }

    private onDateChange(date: Date | null) {
        this.setState({
            selectedDate: date as Date
        }, () => this.calculateCode());
    }

    private onNumberChange(event: React.ChangeEvent<HTMLInputElement>) {
        let error: string = event.target.value && (!event.target.value.match(/[0-9]{8}/) || event.target.value.length > 8) ? "Must be an 8-digit number" : "";
        this.setState({
            selectedNumber: event.target.value || "",
            selectedNumberError: error
        }, () => this.calculateCode());
    }

    // On valid inputs, processing reset code according to python template from Hector as it's done in your device to verify the code
    private calculateCode() {
        if(this.state.selectedDate && this.state.selectedNumber && !this.state.selectedNumberError) {
            let date: number = this.state.selectedDate.getDate();
            let month: number = this.state.selectedDate.getMonth() + 1;
            let requestCode: string = `${month < 10 ? "0" + month : month}${date < 10 ? "0" + date : date}${this.state.selectedNumber.substr(4, 4)}`;

            let response: number = this.crc32(requestCode);
            response = (this.xor(response, 43690) + 5313) % 100000;

            this.setState({
                code: this.pad(response, 5)
            });
        } else {
            this.setState({
                code: ""
            });
        }
    }


    // bitwise calculations in javascript/typescript are done with 32-bit integers, wich are in some cases too small for our calculations
    // therefore we use 'bitwise' node package to do the following three calculations with buffers instead of numbers (wich use 32-bit integers)
    private rightBitShift(input: number, base: number): number {
        return Math.floor(input / Math.pow(2, base));
    }

    private xor(input: number, modifier: number = 63812678145): number {
        let inputHex: string = input.toString(16);
        let modifierHex: string = modifier.toString(16);

        let difference: number = inputHex.length - modifierHex.length;
        if(difference < 0) {
            for(let i: number = 0; i < (difference * -1); i++) {
                inputHex = `0${inputHex}`;
            }
        } else {
            for(let i: number = 0; i < difference; i++) {
                modifierHex = `0${modifierHex}`;
            }
        }

        if(inputHex.length % 2)
            inputHex = `0${inputHex}`;

        if(modifierHex.length % 2)
            modifierHex = `0${modifierHex}`;

        let inputBuffer: Bits = bitwise.buffer.read(Buffer.from(inputHex, "hex"));
        let modifierBuffer: Bits = bitwise.buffer.read(Buffer.from(modifierHex, "hex"));

        
        let resultBuffer: Bits = bitwise.bits.xor(inputBuffer, modifierBuffer);
        let result: number = parseInt(bitwise.bits.toString(resultBuffer), 2)

        return result;
    }

    private and(input: number, modifier: number): number {
        let inputHex: string = input.toString(16);
        let modifierHex: string = modifier.toString(16);

        let difference: number = inputHex.length - modifierHex.length;
        if(difference < 0) {
            for(let i: number = 0; i < (difference * -1); i++) {
                inputHex = `0${inputHex}`;
            }
        } else {
            for(let i: number = 0; i < difference; i++) {
                modifierHex = `0${modifierHex}`;
            }
        }

        if(inputHex.length % 2)
            inputHex = `0${inputHex}`;

        if(modifierHex.length % 2)
            modifierHex = `0${modifierHex}`;

        let inputBuffer: Bits = bitwise.buffer.read(Buffer.from(inputHex, "hex"));
        let modifierBuffer: Bits = bitwise.buffer.read(Buffer.from(modifierHex, "hex"));

        
        let resultBuffer: Bits = bitwise.bits.and(inputBuffer, modifierBuffer);
        let result: number = parseInt(bitwise.bits.toString(resultBuffer), 2)

        return result;
    }

    // processing crc32 according to Hectors python script
    private crc32(input: string, crc: number = 4294967295): number {
        let count: number = input.length;
        let i: number = 0;
        while(count !== 0) {
            count--;
            crc = this.xor(this.and(this.rightBitShift(crc, 8), 16777215), this.table[this.and((this.xor(crc, input[i].charCodeAt(0))), 255)]);
            i++;
        }
        return crc;
    }

    // add leading zeros for numbers and returning as string
    private pad(num: number, size: number): string {
        let string: string = num.toString();
        while (string.length < size) string = "0" + string;
        return string;
    }
}