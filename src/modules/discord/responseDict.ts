/*
 * KodeBlox Copyright 2017 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class Responses {
    public static readonly SUCCESS = [
        "Your wish is my command!",
        "All done boss! :thumbsup:",
        "It is done! :ok_hand:"
    ];
    public static readonly FAIL = [
        "Um...sorry couldn't do that",
        "Computer says no",
        "Oops! problem... :frowning:",
        "Eeek! problems :frowning:"
    ];
    public static readonly NOPARAMS = [
        "Um...I think you are forgetting something",
        "I need more details to work on",
        "Yeah...go on!"
    ];
    public static readonly TOOMANYPARAMS = [
        "Aaah...thats too many details!",
        "No need to hurry. Give me the details one by one"
    ];
    public static readonly NOTACOMMAND = [
        "Um...Were you try to give me a command? If so you may be using the wrong one"
    ];
    public static readonly BOTMENTIONED = [
        "Someone called me!!",
        "I'm here :raised_hand:"
    ];
    public static readonly INSUFFICIENTPERMS = [
        "You don't have the permissions to make me do that"
    ]

    public static getResponse(action: string[]): string {
        return action[Math.floor(Math.random() * action.length)];
    }
}
