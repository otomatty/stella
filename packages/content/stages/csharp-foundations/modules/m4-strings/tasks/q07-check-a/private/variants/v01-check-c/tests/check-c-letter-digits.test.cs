public class CheckCLetterDigitsTests
{
    [Fact(DisplayName = "確認C 5文字の形")]
    public void CheckCLetterDigits()
    {
        Assert.Equal(true, Answers.CheckCLetterDigits("A0123"));
        Assert.Equal(false, Answers.CheckCLetterDigits("a0123"));
        Assert.Equal(false, Answers.CheckCLetterDigits("A01b3"));
        Assert.Equal(false, Answers.CheckCLetterDigits("A123"));
        Assert.Equal(false, Answers.CheckCLetterDigits(""));
        Assert.Equal(false, Answers.CheckCLetterDigits("A01234"));
    }
}
