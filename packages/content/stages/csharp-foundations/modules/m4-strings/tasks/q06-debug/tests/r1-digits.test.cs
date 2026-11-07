public class R1DigitsTests
{
    [Fact(DisplayName = "R1 半角数字のみ")]
    public void R1Digits()
    {
        Assert.Equal(false, Answers.R1Digits("12a"));
        Assert.Equal(true, Answers.R1Digits("123"));
        Assert.Equal(false, Answers.R1Digits(""));
        Assert.Equal(true, Answers.R1Digits("0"));
    }
}
