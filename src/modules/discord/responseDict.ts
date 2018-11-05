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
 *********************************************************************** 
 * List of emoji shortcodes in discord
 *:bowtie:
 *:smile:
 *:simple_smile:
 *:laughing:
 *:blush:
 *:smiley:
 *:relaxed:
 *:smirk:
 *:heart_eyes:
 *:kissing_heart:
 *:kissing_closed_eyes:
 *:flushed:
 *:relieved:
 *:satisfied:
 *:grin:
 *:wink:
 *:stuck_out_tongue_winking_eye:
 *:stuck_out_tongue_closed_eyes:
 *:grinning:
 *:kissing:
 *:kissing_smiling_eyes:
 *:stuck_out_tongue:
 *:sleeping:
 *:worried:
 *:frowning:
 *:anguished:
 *:open_mouth:
 *:grimacing:
 *:confused:
 *:hushed:
 *:expressionless:
 *:unamused:
 *:sweat_smile:
 *:sweat:
 *:disappointed_relieved:
 *:weary:
 *:pensive:
 *:disappointed:
 *:confounded:
 *:fearful:
 *:cold_sweat:
 *:persevere:
 *:cry:
 *:sob:
 *:joy:
 *:astonished:
 *:scream:
 *:neckbeard:
 *:tired_face:
 *:angry:
 *:rage:
 *:triumph:
 *:sleepy:
 *:yum:
 *:mask:
 *:sunglasses:
 *:dizzy_face:
 *:imp:
 *:smiling_imp:
 *:neutral_face:
 *:no_mouth:
 *:innocent:
 *:alien:
 * *****************************************************************
 */

export class Responses {
    public static readonly SUCCESS = [
        "Your wish is my command!",
        "All done boss! :thumbsup:",
        "It is done! :ok_hand:",
		"It was hard but I got there! :weary:",
		"Wow that was fun. Let's do it again! :grinning:" 
    ];
    public static readonly FAIL = [
        "Um...sorry couldn't do that",
        "Computer says no :thumbsdown:",
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
        "Um...were you trying to give me a command? If so you may be using the wrong one"
    ];
    public static readonly INSUFFICIENTPERMS = [
        "You don't have the permissions to make me do that"
    ];
    public static readonly IDNOTFOUND = [
        "The ID you entered does not exist"
    ]

    public static getResponse(action: string[]): string {
        return action[Math.floor(Math.random() * action.length)];
    }
}
