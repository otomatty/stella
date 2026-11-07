public class S07Middle2IsDigitsTests
{
    [Fact(DisplayName = "S07 中央の数字")]
    public void S07Middle2IsDigits()
    {
        Assert.Equal(true, Answers.S07Middle2IsDigits("AB12CD"));
        Assert.Equal(false, Answers.S07Middle2IsDigits("ABx2CD"));
        Assert.Equal(false, Answers.S07Middle2IsDigits("A"));
        Assert.Equal(true, Answers.S07Middle2IsDigits("123456"));
    }
}
