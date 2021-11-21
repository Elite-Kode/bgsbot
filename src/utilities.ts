/*
 * Copyright 2021 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export function getTrendIcon(trend: number): string {
  if (trend > 0) {
    return '⬆️';
  } else if (trend < 0) {
    return '⬇️';
  } else {
    return '↔️';
  }
}

export function acronym(text: string): string {
  return text.split(/\s/).reduce((accumulator, word) => accumulator + word.charAt(0), '');
}

export function titlify(title: string): string {
  let revised = title.charAt(0).toUpperCase();
  for (let i = 1; i < title.length; i++) {
    if (title.charAt(i - 1) === ' ') {
      revised += title.charAt(i).toUpperCase();
    } else {
      revised += title.charAt(i).toLowerCase();
    }
  }
  return revised;
}
