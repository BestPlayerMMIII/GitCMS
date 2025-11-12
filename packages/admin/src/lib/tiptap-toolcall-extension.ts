import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Custom TipTap extension for GitCMS toolcall embedding
 * Allows embedding interactive tool calls with custom parameters
 */
export const GitCMSToolcall = Node.create({
  name: 'gitcmsToolcall',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
      },
      // Store all parameters as a JSON string in a data attribute
      // This allows us to handle any number of custom parameters
      'data-params': {
        default: null,
        parseHTML: element => element.getAttribute('data-params'),
        renderHTML: attributes => {
          if (!attributes['data-params']) {
            return {};
          }
          return {
            'data-params': attributes['data-params'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'gitcms-toolcall',
        getAttrs: element => {
          if (typeof element === 'string') return false;

          const id = element.getAttribute('id');
          if (!id) return false;

          // Extract all custom parameters (those starting with _)
          const params: Record<string, string> = {};
          Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('_')) {
              const key = attr.name.substring(1); // Remove the _ prefix
              params[key] = attr.value;
            }
          });

          return {
            id,
            'data-params': JSON.stringify(params),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Parse the stored parameters
    let params: Record<string, string> = {};
    try {
      if (HTMLAttributes['data-params']) {
        params = JSON.parse(HTMLAttributes['data-params']);
      }
    } catch (error) {
      console.error('Failed to parse toolcall params:', error);
    }

    // Build attributes object with the id and all custom parameters prefixed with _
    const attrs: Record<string, string> = {
      id: HTMLAttributes.id,
    };

    // Add all custom parameters with _ prefix
    Object.entries(params).forEach(([key, value]) => {
      attrs[`_${key}`] = value;
    });

    return ['gitcms-toolcall', mergeAttributes(attrs)];
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('span');
      wrapper.classList.add('gitcms-toolcall-wrapper');

      // Parse parameters
      let params: Record<string, string> = {};
      try {
        if (node.attrs['data-params']) {
          params = JSON.parse(node.attrs['data-params']);
        }
      } catch (error) {
        console.error('Failed to parse toolcall params:', error);
      }

      // Create compact inline representation
      const container = document.createElement('span');
      container.classList.add('gitcms-toolcall-container');

      // Icon
      const icon = document.createElement('span');
      icon.classList.add('gitcms-toolcall-icon');
      icon.innerHTML = '⚡';

      // ID
      const id = document.createElement('span');
      id.classList.add('gitcms-toolcall-id');
      id.textContent = node.attrs.id || 'UNKNOWN';

      // Parameter count badge (if params exist)
      const paramCount = Object.keys(params).length;
      if (paramCount > 0) {
        const badge = document.createElement('span');
        badge.classList.add('gitcms-toolcall-badge');
        badge.textContent = `${paramCount}`;
        badge.title = Object.entries(params)
          .map(([k, v]) => `${k}="${v}"`)
          .join(', ');
        container.appendChild(icon);
        container.appendChild(id);
        container.appendChild(badge);
      } else {
        container.appendChild(icon);
        container.appendChild(id);
      }

      wrapper.appendChild(container);

      return {
        dom: wrapper,
      };
    };
  },
});
