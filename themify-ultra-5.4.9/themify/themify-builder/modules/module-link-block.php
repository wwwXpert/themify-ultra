<?php
if(!defined('ABSPATH'))
    exit; // Exit if accessed directly

/**
 * Module Name: Link
 * Description: Display Link
 */
class TB_Link_Block_Module extends Themify_Builder_Component_Module {

    public function __construct() {
        parent::__construct(array('name'=>__('Link Block', 'themify'), 'slug'=>'link-block'));
    }

    public function get_icon() {
        return 'link';
    }

    public function get_assets() {
        return array('css'=>THEMIFY_BUILDER_CSS_MODULES . $this->slug . '.css');
    }

    public function get_options() {
        return array(
            array(
                'id' => 'shape',
                'type' => 'layout',
                'mode' => 'sprite',
                'label' => __( 'Shape', 'themify' ),
                'options' => array(
                    array( 'img' => 'normall_button', 'value' => 'normal', 'label' => __( 'Default', 'themify' ) ),
                    array( 'img' => 'squared_button', 'value' => 'squared', 'label' => __( 'Squared', 'themify' ) ),
                    array( 'img' => 'circle_button', 'value' => 'circle', 'label' => __( 'Circle', 'themify' ) ),
                    array( 'img' => 'rounded_button', 'value' => 'rounded', 'label' => __( 'Rounded', 'themify' ) ),
                )
            ),
            array(
                'id' => 'style',
                'type' => 'layout',
                'mode' => 'sprite',
                'label' => 'bg',
                'options' => array(
                    array( 'img' => 'solid_button', 'value' => 'solid', 'label' => __( 'Solid', 'themify' ) ),
                    array( 'img' => 'transparent_button', 'value' => 'transparent', 'label' => __( 'Transparent', 'themify' ) ),
                )
            ),
            array(
                'id'=>'heading',
                'type'=>'text',
                'label'=>'head',
                'control'=>array('selector'=>'.tf_link_heading')
            ),
            array(
                'id' => 'blurb',
                'type' => 'textarea',
                'label' => __('Blurb','themify'),
                'control' => array('selector' => '.tf_link_blurb')
            ),
            array(
                'id'=>'link',
                'type'=>'url',
                'label'=>__('Link', 'themify'),
                'class'=>'fullwidth',
                'binding'=>array(
                    'empty'=>array('hide'=>array('link_options', 'button_color_bg', 'title', 'nofollow_link')),
                    'not_empty'=>array('show'=>array('link_options', 'button_color_bg', 'title', 'nofollow_link'))
                )
            ),
            array(
                'id'=>'link_options',
                'type'=>'radio',
                'label'=>'o_l',
                'link_type'=>true,
                'option_js'=>true
            ),
            array(
                'id'=>'nofollow_link',
                'type'=>'toggle_switch',
                'label'=>__('Nofollow', 'themify'),
                'options'=>array('on'=>array('name'=>'yes')),
                'help'=>__("If nofollow is enabled, search engines won't crawl this link.", 'themify'),
                'control'=>false,
                'wrap_class'=>'tb_group_element_regular tb_group_element_newtab'
            ),
            array(
                'type'=>'multi',
                'label'=>__('Lightbox Dimension', 'themify'),
                'options'=>array(
                    array(
                        'id'=>'lightbox_width',
                        'type'=>'range',
                        'label'=>'w',
                        'control'=>false,
                        'units'=>array('px'=>array('min'=>0, 'max'=>3000), '%'=>array('min'=>0, 'max'=>100))
                    ),
                    array(
                        'id'=>'lightbox_height',
                        'label'=>'ht',
                        'control'=>false,
                        'type'=>'range',
                        'units'=>array('px'=>array('min'=>0, 'max'=>3000), '%'=>array('min'=>0, 'max'=>100))
                    )
                ),
                'wrap_class'=>'tb_group_element_lightbox lightbox_size'
            ),
            array(
                'id'=>'color',
                'type'=>'layout',
                'label'=>'c',
                'class'=>'tb_colors',
                'mode'=>'sprite',
                'color'=>true,
                'transparent'=>true
            ),
            array(
                'id' => 'icon_type',
                'type' => 'radio',
                'label' => __('Icon Type', 'themify'),
                'options' => array(
                    array('value'=>'icon','name'=>__('Icon', 'themify')),
                    array('value'=>'image','name'=>__('Image', 'themify'))
                ),
                'option_js' => true
            ),
            array(
                'id' => 'image',
                'type' => 'image',
                'label' => __('Image URL', 'themify'),
                'wrap_class' => 'tb_group_element_image'
            ),
            array(
                'id'=>'icon',
                'type'=>'icon',
                'label'=>__('Icon', 'themify'),
                'class'=>'fullwidth',
                'binding'=>array(
                    'empty'=>array('hide'=>array('icon_alignment')),
                    'not_empty'=>array('show'=>array('icon_alignment'))
                ),
                'wrap_class' => 'tb_group_element_icon'
            ),
            array(
                'id'=>'title',
                'type'=>'text',
                'label'=>__('Title Attribute', 'themify'),
                'class'=>'fullwidth',
                'control'=>false,
                'help'=>__("Title attribute is for web accessibility purpose to describe the link.", 'themify')
            ),
            array('id'=>'css_class', 'type'=>'custom_css'),
            array('type'=>'custom_css_id')
        );
    }

    public function get_live_default() {
        return array(
            'heading'=>__('Heading', 'themify'),
            'blurb'=>__('Blurb text here', 'themify'),
            'link'=>'https://themify.me/',
            'color'=>'tb_default_color',
            'icon_type' => 'icon'
        );
    }

    public function get_styling() {
        $general=array(
			// Background
            self::get_expand('bg', array(
                self::get_tab(array(
                    'n'=>array('options'=>array(self::get_image(' .tb_link_block_container'))),
                    'h'=>array('options'=>array(self::get_image(' .tb_link_block_container', 'b_i', 'bg_c', 'b_r', 'b_p', 'h')))
                ))
            )),
            // Font
            self::get_expand('f', array(
                self::get_tab(array(
                    'n'=>array(
                        'options'=>array(
                            self::get_font_family(' .tb_link_block_container'),
                            self::get_color(' .tb_link_block_container', 'f_c_g'),
                            self::get_font_size(' .tb_link_block_container'),
                            self::get_line_height(' .tb_link_block_container'),
                            self::get_letter_spacing(' .tb_link_block_container'),
                            self::get_text_align(' .tb_link_block_container'),
                            self::get_text_transform(' .tb_link_block_container'),
                            self::get_font_style(' .tb_link_block_container'),
                            self::get_text_decoration(' .tb_link_block_container', 't_d_r'),
                            self::get_text_shadow(' .tb_link_block_container')
                        )
                    ),
                    'h'=>array(
                        'options'=>array(
                            self::get_font_family(' .tb_link_block_container', 'f_f', 'h'),
                            self::get_color(' .tb_link_block_container:hover', 'f_c_g_h', null, null, ''),
                            self::get_font_size(' .tb_link_block_container', 'f_s', '', 'h'),
                            self::get_line_height(' .tb_link_block_container', 'l_h', 'h'),
                            self::get_letter_spacing(' .tb_link_block_container', 'l_s', 'h'),
                            self::get_text_align(' .tb_link_block_container', 't_a', 'h'),
                            self::get_text_transform(' .tb_link_block_container', 't_t', 'h'),
                            self::get_font_style(' .tb_link_block_container', 'f_st', 'f_w', 'h'),
                            self::get_text_decoration(' .tb_link_block_container', 't_d_r', 'h'),
                            self::get_text_shadow(' .tb_link_block_container', 't_sh', 'h')
                        )
                    )
                ))
            )),
            // Padding
            self::get_expand('p', array(
                self::get_tab(array(
                    'n'=>array('options'=>array(self::get_padding(' .tb_link_block_container '))),
                    'h'=>array('options'=>array(self::get_padding(' .tb_link_block_container', 'p', 'h')))
                ))
            )),
            // Margin
            self::get_expand('m', array(
                self::get_tab(array(
                    'n'=>array('options'=>array(self::get_margin(' .tb_link_block_container'),)),
                    'h'=>array('options'=>array(self::get_margin(' .tb_link_block_container', 'm', 'h')))
                ))
            )),
            // Border
            self::get_expand('b', array(
                self::get_tab(array(
                    'n'=>array('options'=>array(self::get_border(' .tb_link_block_container'))),
                    'h'=>array('options'=>array(self::get_border(' .tb_link_block_container', 'b', 'h')))
                ))
            )),
			// Width
			self::get_expand('w', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_width('', 'w')
						)
					),
					'h' => array(
						'options' => array(
							self::get_width('', 'w', 'h')
						)
					)
				))
			)),
			// Height & Min Height
			self::get_expand('ht', array(
					self::get_height(''),
					self::get_min_height(''),
					self::get_max_height('')
				)
			),
            // Rounded Corners
            self::get_expand('r_c', array(
                self::get_tab(array(
                    'n'=>array('options'=>array(self::get_border_radius(' .tb_link_block_container'))),
                    'h'=>array('options'=>array(self::get_border_radius(' .tb_link_block_container', 'r_c', 'h')))
                ))
            )),
            // Shadow
            self::get_expand('sh', array(
                self::get_tab(array(
                    'n'=>array('options'=>array(self::get_box_shadow(' .tb_link_block_container'))),
                    'h'=>array('options'=>array(self::get_box_shadow(' .tb_link_block_container', 'sh', 'h')))
                ))
            )),
            // Display
            self::get_expand('disp', self::get_display('')),
            // Position
            self::get_expand('po', array(self::get_css_position('')))
        );

		$heading = array(
			self::get_expand('f', array(
			self::get_tab(array(
				'n' => array(
				'options' => array(
					self::get_font_family(' .tb_link_block_heading', 'f_f_l_h'),
					self::get_color(' .tb_link_block_heading', 'f_c_l_h'),
					self::get_font_size(' .tb_link_block_heading', 'f_s_l_h'),
					self::get_line_height(' .tb_link_block_heading', 'l_h_l_h'),
					self::get_letter_spacing(' tb_link_block_heading', 'l_s_l_h'),
					self::get_text_transform(' .tb_link_block_heading', 't_t_l_h'),
					self::get_font_style(' .tb_link_block_heading', 'f_st_l_h', 'f_b_l_h'),
					self::get_text_shadow(' .tb_link_block_heading', 't_sh_l_h')
				)
				),
				'h' => array(
				'options' => array(
					self::get_font_family(' .tb_link_block_heading', 'f_f_l_h', 'h'),
					self::get_color('.module .tb_link_block_heading', 'f_c_l_h', null, null, 'hover'),
					self::get_font_size(' .tb_link_block_heading', 'f_s_l_h', '', 'h'),
					self::get_line_height(' .tb_link_block_heading', 'l_h_l_h', 'h'),
					self::get_letter_spacing(' .tb_link_block_heading', 'l_s_l_h', 'h'),
					self::get_text_transform(' .tb_link_block_heading', 't_t_l_h', 'h'),
					self::get_font_style(' .tb_link_block_heading', 'f_st_l_h', 'f_b_l_h', 'h'),
					self::get_text_shadow(' .tb_link_block_heading', 't_sh_l_h','h')
				)
				)
			))
			)),
			// Margin
			self::get_expand('m', array(
			self::get_tab(array(
				'n' => array(
				'options' => array(
					self::get_margin(' .tb_link_block_heading', 'm_l_h')
				)
				),
				'h' => array(
				'options' => array(
					self::get_margin(' .tb_link_block_heading', 'm_l_h', 'h')
				)
				)
			))
			))
		);

		$icon = array(
			// Background
			self::get_expand('bg', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_color(' .tb_link_block_icon', 'b_c_i', 'bg_c', 'background-color')
					)
					),
					'h' => array(
					'options' => array(
						self::get_color(' .tb_link_block_icon', 'b_c_i', 'bg_c', 'background-color', 'h')
					)
					)
				))
			)),
			// Color
			self::get_expand('c', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_color(' .tb_link_block_icon', 'f_c_i')
					)
					),
					'h' => array(
					'options' => array(
						self::get_color(' .tb_link_block_icon', 'f_c_i', null, null, 'hover')
					)
					)
				))
			)),
			// Font Size
			self::get_expand('Size', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_font_size(' .tb_link_block_icon', 'f_s_i')
					)
					),
					'h' => array(
					'options' => array(
						self::get_font_size(' .tb_link_block_icon', 'f_s_i', '', 'h')
					)
					)
				))
			)),
			// Padding
			self::get_expand('p', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_padding(' .tb_link_block_icon', 'p_i')
					)
					),
					'h' => array(
					'options' => array(
						self::get_padding(' .tb_link_block_icon', 'p_i', 'h')
					)
					)
				))
			)),
			// Margin
			self::get_expand('m', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_margin(' .tb_link_block_icon', 'm_i')
					)
					),
					'h' => array(
					'options' => array(
						self::get_margin(' .tb_link_block_icon', 'm_i', 'h')
					)
					)
				))
			)),
			// Border
			self::get_expand('b', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_border(' .tb_link_block_icon', 'b_i')
					)
					),
					'h' => array(
					'options' => array(
						self::get_border(' .tb_link_block_icon', 'b_i', 'h')
					)
					)
				))
			)),
			// Rounded Corners
			self::get_expand('r_c', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_border_radius(' .tb_link_block_icon', 'r_c_i')
						)
					),
					'h' => array(
						'options' => array(
							self::get_border_radius(' .tb_link_block_icon', 'r_c_i', 'h')
						)
					)
				))
			)),
			// Shadow
			self::get_expand('sh', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_box_shadow(' .tb_link_block_icon', 'sh_i')
						)
					),
					'h' => array(
						'options' => array(
							self::get_box_shadow(' .tb_link_block_icon', 'sh_i', 'h')
						)
					)
				))
			))
		);

		$link_image = array(
			// Background
			self::get_expand('bg', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_color(' .tb_link_block_img', 'b_c_li', 'bg_c', 'background-color')
					)
					),
					'h' => array(
					'options' => array(
						self::get_color(' .tb_link_block_img', 'b_c_li', 'bg_c', 'background-color', 'h')
					)
					)
				))
			)),
			// Padding
			self::get_expand('p', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_padding(' .tb_link_block_img', 'p_li')
					)
					),
					'h' => array(
					'options' => array(
						self::get_padding(' .tb_link_block_img', 'p_li', 'h')
					)
					)
				))
			)),
			// Margin
			self::get_expand('m', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_margin(' .tb_link_block_img', 'm_li')
					)
					),
					'h' => array(
					'options' => array(
						self::get_margin(' .tb_link_block_img', 'm_li', 'h')
					)
					)
				))
			)),
			// Border
			self::get_expand('b', array(
				self::get_tab(array(
					'n' => array(
					'options' => array(
						self::get_border(' .tb_link_block_img', 'b_li')
					)
					),
					'h' => array(
					'options' => array(
						self::get_border(' .tb_link_block_img', 'b_li', 'h')
					)
					)
				))
			)),
			// Rounded Corners
			self::get_expand('r_c', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_border_radius(' .tb_link_block_img', 'r_c_li')
						)
					),
					'h' => array(
						'options' => array(
							self::get_border_radius(' .tb_link_block_img', 'r_c_li', 'h')
						)
					)
				))
			)),
			// Shadow
			self::get_expand('sh', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_box_shadow(' .tb_link_block_img', 'sh_li')
						)
					),
					'h' => array(
						'options' => array(
							self::get_box_shadow(' .tb_link_block_img', 'sh_li', 'h')
						)
					)
				))
			))
		);

        return array(
            'type'=>'tabs',
            'options'=>array(
                'g'=>array('options'=>$general
				),
				'link_heading' => array(
					'label' => __('Heading', 'themify'),
					'options' => $heading
				),
				'link_icon' => array(
					'label' => __('Icon', 'themify'),
					'options' => $icon
				),
				'link_image' => array(
					'label' => __('Image', 'themify'),
					'options' => $link_image
				)
            )
        );
    }

    protected function _visual_template() {
        ?>
            <# const color = undefined == data.color || data.color=='default' ? 'tb_default_color' : data.color,
				tag=data.link?'a':'span';
			#>
        <div class="module module-<?php echo $this->slug; ?> {{ data.shape!=='normal'?data.shape:'' }} {{ data.style }} tf_textc">
		<{{tag}} class="tb_link_block_container ui {{ color }}"<# if(data.link){#> href="{{data.link}}"<#}#> >
            <#if (data.icon_type!='image' && data.icon){ #>
            <em class="tb_link_block_icon"><# print(tb_app.Utils.getIcon(data.icon).outerHTML)#></em>
            <# }
            if (data.icon_type=='image' && data.image){ #>
            <img class="tf_vmiddle tf_box tb_link_block_img" src="{{ data.image }}">
            <# }
            if (data.heading ) { #>
            <span class="tb_link_block_heading tf_block" contenteditable="false" data-name="heading">{{{ data.heading }}}</span>
            <# }
            if (data.blurb ) { #>
            <span class="tb_link_block_blurb tf_block" contenteditable="false" data-name="blurb">{{{ data.blurb }}}</span>
            <# } #>
            </{{ tag}}>
        </div>
        <?php
    }

}

///////////////////////////////////////
// Module Options
///////////////////////////////////////
Themify_Builder_Model::register_module('TB_Link_Block_Module');
