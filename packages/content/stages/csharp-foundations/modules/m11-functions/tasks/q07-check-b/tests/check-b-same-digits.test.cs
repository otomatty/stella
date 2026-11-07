public class CheckBSameDigitsTests
{
    [Fact(DisplayName = "確認B 同じ長さの数字")]
    public void CheckBSameDigits()
    {
        Assert.Equal(true, Answers.CheckBSameDigits("01", "23"));
        Assert.Equal(false, Answers.CheckBSameDigits("", ""));
        Assert.Equal(false, Answers.CheckBSameDigits("12", "123"));
        Assert.Equal(false, Answers.CheckBSameDigits("12", "1a"));
    }
}
