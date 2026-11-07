public class S04BothFourDigitsTests
{
    [Fact(DisplayName = "S04 二つのコード")]
    public void S04BothFourDigits()
    {
        Assert.Equal(true, Answers.S04BothFourDigits("0123", "9876"));
        Assert.Equal(false, Answers.S04BothFourDigits("0123", "9a76"));
        Assert.Equal(false, Answers.S04BothFourDigits("123", "9876"));
        Assert.Equal(false, Answers.S04BothFourDigits("", "0000"));
    }
}
