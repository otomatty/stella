public class S10CountInvalid6Tests
{
    [Fact(DisplayName = "S10 検査の件数")]
    public void S10CountInvalid6()
    {
        Assert.Equal(2, Answers.S10CountInvalid6(new string[] { "012345", "12345a", "" }));
        Assert.Equal(0, Answers.S10CountInvalid6(new string[] { }));
        Assert.Equal(0, Answers.S10CountInvalid6(new string[] { "012345" }));
        Assert.Equal(1, Answers.S10CountInvalid6(new string[] { "1234567" }));
    }
}
